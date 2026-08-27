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
 * Whether a run may deactivate the listings it did not see.
 *
 * Requires both an exhaustive crawl and at least one result — zero results
 * from a supposedly complete crawl is far more likely to be a broken parser
 * or a bot block than a genuinely empty catalog.
 */
export function decideDeactivation(
  end: CrawlEnd,
  scrapedCount: number,
): DeactivationDecision {
  if (scrapedCount === 0) {
    return {
      allowed: false,
      reason:
        "skipped: the crawl returned zero properties, which is more likely a broken parser or a bot block than an empty catalog",
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
