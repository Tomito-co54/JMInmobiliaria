import { createScraperClient } from "../http-client";
import {
  upsertScrapedProperty,
  deactivateStale,
  countActiveListings,
  type UpsertResult,
} from "../persistence";
import type { ScrapedProperty, ScraperRunResult } from "../types";
import { decideDeactivation, type CrawlEnd } from "../crawl-completeness";
import { buildListUrl, PARTIDOS_SLUGS } from "./urls";
import { parseListPage } from "./parser";

/**
 * Scrape Zonaprop listings for a partido and persist to DB.
 *
 * Strategy:
 *   1. Paginate through search pages (1, 2, 3, ...) until either
 *      maxProperties is reached or a page returns 0 cards.
 *   2. Per property, upsert into DB. New rows = inserted. Existing rows
 *      get updated and diffed; field changes are appended to property_history.
 *   3. After the run, mark any property in this partido that wasn't seen
 *      as inactive (is_active = false) — but ONLY if the crawl actually
 *      reached the end of the listing. A truncated crawl has no evidence
 *      about the pages it never opened. See ../crawl-completeness.ts.
 */

/** Politeness gap between page fetches, since each one is its own session. */
const BETWEEN_PAGES_MS = 8000;

export interface ScrapeZonapropOptions {
  /** Partido name (must match PARTIDOS_SLUGS keys) */
  partido: string;
  /**
   * Max number of properties to process. Unlimited by default: a partial
   * crawl cannot deactivate anything, so capping it silently degrades the
   * data. Pass a number only for quick manual testing.
   */
  maxProperties?: number;
  /**
   * Safety bound on pagination, not a target. Default 50 pages (~1250
   * listings at 25/page). Hitting it marks the crawl as truncated.
   */
  maxPages?: number;
  /** If true, show the browser window. Default false. */
  headed?: boolean;
}

export async function scrapeZonaprop(
  options: ScrapeZonapropOptions,
): Promise<ScraperRunResult> {
  const { partido, headed = false } = options;
  const maxProperties = options.maxProperties ?? Number.POSITIVE_INFINITY;
  const maxPages = options.maxPages ?? 50;

  if (!PARTIDOS_SLUGS[partido]) {
    throw new Error(
      `Unknown partido "${partido}". Valid: ${Object.keys(PARTIDOS_SLUGS).join(", ")}`,
    );
  }

  const result: ScraperRunResult = {
    source: "zonaprop",
    partido,
    scrapedCount: 0,
    insertedCount: 0,
    updatedCount: 0,
    deactivatedCount: 0,
    errorCount: 0,
    durationMs: 0,
    crawlEnd: "page_cap",
    deactivationReason: "",
  };

  // Pessimistic until proven otherwise: if the loop never reports reaching
  // the end, the run must not be trusted to deactivate anything.
  let crawlEnd: CrawlEnd = "page_cap";

  const startedAt = Date.now();
  const allScraped: ScrapedProperty[] = [];
  const seenExternalIds = new Set<string>();

  // Read before the crawl: how much we hold active is the yardstick the run's
  // coverage is measured against, and the upsert loop below would move it.
  //
  // Starts as `null`, meaning "unknown", and only becomes a number if the read
  // actually succeeds. It used to start at 0, and 0 waived the coverage test —
  // so a failed baseline read silently disarmed the guard. That is what let a
  // run that saw 45 listings deactivate 375 on 1-sep-2026. A failure here
  // still must not stop the scrape: it stops the deactivation, which is the
  // only part that cannot be undone.
  let activeBefore: number | null = null;
  try {
    activeBefore = await countActiveListings("zonaprop", partido);
  } catch (err) {
    console.warn(
      "[zonaprop] Could not read the active baseline:",
      err instanceof Error ? err.message : err,
    );
  }

  try {
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      if (allScraped.length >= maxProperties) {
        crawlEnd = "property_cap";
        break;
      }

      const url = buildListUrl(partido, pageNum);
      console.log(`[zonaprop] Fetching page ${pageNum}: ${url}`);

      // Zonaprop serves the first navigation of a browser session and 403s
      // the second, whatever the URL — page 2 loads fine on its own but not
      // after page 1. So every page gets a fresh browser, which makes each
      // request "the first one" again. Measured: 3 pages, 3 sessions, 3
      // successes; the same 3 pages in one session died on the second.
      //
      // Costs ~1-2s per page to launch Chromium. Cheap next to the
      // alternative, which was a paid residential proxy.
      if (pageNum > 1) {
        await new Promise((r) => setTimeout(r, BETWEEN_PAGES_MS));
      }

      const client = await createScraperClient({ headed });
      let properties: ScrapedProperty[];
      try {
        const page = await client.newPage();
        await client.gotoRateLimited(page, url);
        properties = await parseListPage(page, partido);
      } catch (err) {
        console.error(
          `[zonaprop] Failed to load page ${pageNum}:`,
          err instanceof Error ? err.message : err,
        );
        result.errorCount++;
        crawlEnd = "page_error";
        break;
      } finally {
        await client.close();
      }

      console.log(`[zonaprop] Page ${pageNum}: ${properties.length} cards found`);

      if (properties.length === 0) {
        crawlEnd = "exhausted";
        break;
      }

      for (const prop of properties) {
        if (seenExternalIds.has(prop.externalId)) continue; // dedupe within run
        seenExternalIds.add(prop.externalId);
        allScraped.push(prop);
        if (allScraped.length >= maxProperties) {
          crawlEnd = "property_cap";
          break;
        }
      }
    }

    // Persist
    console.log(`[zonaprop] Upserting ${allScraped.length} properties...`);
    for (const prop of allScraped) {
      result.scrapedCount++;
      try {
        const r: UpsertResult = await upsertScrapedProperty(prop);
        if (r === "inserted") result.insertedCount++;
        else if (r === "updated") result.updatedCount++;
      } catch (err) {
        console.error(
          `[zonaprop] Upsert failed for ${prop.externalId}:`,
          err instanceof Error ? err.message : err,
        );
        result.errorCount++;
      }
    }

    // Only a crawl that reached the end of the listing may declare the
    // properties it didn't see gone. Anything else and we'd be inventing
    // data about pages we never opened.
    //
    // "Reached the end" is a weaker claim than it reads: an empty page is
    // how a soft block looks too (parser.ts returns nothing when the card
    // selector never appears). Hence the baseline — see crawl-completeness.
    result.crawlEnd = crawlEnd;
    const decision = decideDeactivation(
      crawlEnd,
      allScraped.length,
      activeBefore,
    );
    result.deactivationReason = decision.reason;
    console.log(`[zonaprop] Deactivation ${decision.reason}`);

    if (decision.allowed) {
      try {
        result.deactivatedCount = await deactivateStale(
          "zonaprop",
          partido,
          Array.from(seenExternalIds),
        );
      } catch (err) {
        console.error(
          "[zonaprop] Deactivation step failed:",
          err instanceof Error ? err.message : err,
        );
        result.errorCount++;
      }
    }
  } finally {
    result.durationMs = Date.now() - startedAt;
  }

  return result;
}

export { PARTIDOS_SLUGS };
