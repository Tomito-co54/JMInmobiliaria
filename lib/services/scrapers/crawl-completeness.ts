/**
 * Deciding whether a scrape run earned the right to mark listings dead.
 *
 * `deactivateStale()` flips `is_active = false` on every listing it did not
 * see. That is only sound when the crawl actually reached the end of the
 * source's catalog. A run that stopped early — because it hit a cap, or
 * because a page failed to load — knows nothing about the listings it never
 * looked at, and marking those dead invents data.
 *
 * The distinction matters because `is_active` is not cosmetic: the market
 * dashboard reads it to answer "how much inventory is still on the market"
 * and "which listings have gone stale". A false negative there looks exactly
 * like a real one.
 *
 * 31-ago-2026 — the guard was walked past a second time, and the hole was
 * not in this module but in what "exhausted" is inferred from. The Zonaprop
 * parser reports an empty page when the card selector never appears, and a
 * blocked page is empty in exactly the same way as the page after the last
 * result. So a run that saw 41 listings out of 412 declared the catalog
 * finished and deactivated 359. A local run that evening re-crawled and
 * found 208 of those 359 alive, which is the proof they were never gone.
 *
 * Same shape as the basemap providers documented in CLAUDE.md: the refusal
 * arrives dressed as a success. Only `page_error` (an explicit HTTP failure)
 * was being caught, and a soft block is not one.
 *
 * The fix here is deliberately NOT another reading of the page — the markup
 * that would say "no results" could not be verified (Zonaprop 403s after ~9
 * requests per IP), and a guard built on an unverified selector is the same
 * bet that just lost. It is arithmetic instead: a crawl that saw a small
 * fraction of what we currently hold active has not earned a mass extinction,
 * whatever it believes about reaching the end.
 */

export type CrawlEnd =
  /** Walked the listing to its end — the source had nothing more to give. */
  | "exhausted"
  /** Stopped because maxProperties was reached. */
  | "property_cap"
  /** Stopped because maxPages was reached. */
  | "page_cap"
  /** Stopped because a page failed to load. */
  | "page_error";

export interface DeactivationDecision {
  allowed: boolean;
  /** English, logged by the scraper. Explains the call either way. */
  reason: string;
}

/**
 * Share of the currently-active set a crawl must have seen before it is
 * allowed to declare the rest gone.
 *
 * Half is deliberately loose. It is not trying to model how fast a real
 * market turns over — it is trying to separate a working crawl from a
 * blocked one, and those are orders of magnitude apart, not percentage
 * points. The run that motivated it saw 10% (41 of 412); a healthy run the
 * same night saw 88% (242 of 275). Anything landing between the two is
 * ambiguous enough that skipping is the right call: a listing wrongly left
 * active is corrected by the next crawl, while a listing wrongly marked gone
 * writes a permanent row into `property_history`.
 */
export const MIN_COVERAGE_RATIO = 0.5;

/**
 * Whether a run may deactivate the listings it did not see.
 *
 * Three conditions, each from a distinct failure that actually happened:
 *   1. The crawl reached the end (not a cap, not a page error) — the 50-listing
 *      "(testing)" cap that invented 317 deaths.
 *   2. It brought back something — zero results from a supposedly complete
 *      crawl is a broken parser or a bot block, not an empty catalog.
 *   3. It saw a real share of what we hold active — a soft block that yields
 *      one page still satisfies 1 and 2.
 *
 * `activeCount` is how many listings this source+partido had active *before*
 * the run touched anything. Pass 0 when there is nothing to lose (a first
 * crawl), which skips the coverage test since there is no baseline to
 * compare against.
 */
export function decideDeactivation(
  end: CrawlEnd,
  scrapedCount: number,
  activeCount: number,
): DeactivationDecision {
  if (scrapedCount === 0) {
    return {
      allowed: false,
      reason:
        "skipped: the crawl returned zero properties, which is more likely a broken parser or a bot block than an empty catalog",
    };
  }

  // Checked before the switch so it applies to every "we finished" claim,
  // however the crawl came to believe it.
  if (activeCount > 0 && scrapedCount < activeCount * MIN_COVERAGE_RATIO) {
    const pct = Math.round((scrapedCount / activeCount) * 100);
    return {
      allowed: false,
      reason:
        `skipped: the crawl saw ${scrapedCount} listings against ${activeCount} currently active (${pct}%), ` +
        "too few to have reached the end of anything — far more likely a soft block that served one page",
    };
  }

  switch (end) {
    case "exhausted":
      return {
        allowed: true,
        reason: "crawl reached the end of the listing, so unseen properties are genuinely gone",
      };
    case "property_cap":
      return {
        allowed: false,
        reason:
          "skipped: the crawl stopped at maxProperties, so it never looked at the rest of the catalog",
      };
    case "page_cap":
      return {
        allowed: false,
        reason:
          "skipped: the crawl stopped at maxPages, so it never looked at the rest of the catalog",
      };
    case "page_error":
      return {
        allowed: false,
        reason:
          "skipped: a page failed to load, so the crawl is incomplete through no fault of the source",
      };
  }
}
