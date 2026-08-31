import { createScraperClient } from "../http-client";
import {
  upsertScrapedProperty,
  deactivateStale,
  countActiveListings,
  type UpsertResult,
} from "../persistence";
import type { ScraperRunResult } from "../types";
import { decideDeactivation, type CrawlEnd } from "../crawl-completeness";
import { buildListUrl, PARTIDOS_SLUGS } from "./urls";
import { parseListPage } from "./parser";

/**
 * Scrape Trezza Propiedades listings for a partido and persist to DB.
 *
 * Trezza is a single agency (much smaller catalog than portals like Zonaprop)
 * so we typically get all properties in a partido in one page (with infinite
 * scroll handled by the parser).
 */

export interface ScrapeTrezzaOptions {
  partido: string;
  /**
   * Safety bound on the infinite-scroll parse, not a target. Default 1000.
   * If the parse comes back exactly at this number the catalog was probably
   * larger, so the crawl counts as truncated and deactivation is skipped.
   */
  maxProperties?: number;
  /** Show browser window (debugging). Default false. */
  headed?: boolean;
}

export async function scrapeTrezza(
  options: ScrapeTrezzaOptions,
): Promise<ScraperRunResult> {
  const { partido, headed = false } = options;
  const maxProperties = options.maxProperties ?? 1000;

  if (!PARTIDOS_SLUGS[partido]) {
    throw new Error(
      `Unknown Trezza partido "${partido}". Valid: ${Object.keys(PARTIDOS_SLUGS).join(", ")}`,
    );
  }

  const result: ScraperRunResult = {
    source: "trezza",
    partido,
    scrapedCount: 0,
    insertedCount: 0,
    updatedCount: 0,
    deactivatedCount: 0,
    errorCount: 0,
    durationMs: 0,
    crawlEnd: "page_error",
    deactivationReason: "",
  };

  // Pessimistic until the list page is parsed successfully.
  let crawlEnd: CrawlEnd = "page_error";

  const startedAt = Date.now();

  // Same baseline as Zonaprop, read before anything is touched. Trezza has
  // no anti-bot worth the name, but the guard costs one count and the
  // failure it prevents is unrecoverable.
  let activeBefore = 0;
  try {
    activeBefore = await countActiveListings("trezza", partido);
  } catch (err) {
    console.warn(
      "[trezza] Could not read the active baseline:",
      err instanceof Error ? err.message : err,
    );
  }

  // Trezza has no anti-bot to speak of, but we still rate-limit to be polite.
  const client = await createScraperClient({ headed, minDelayMs: 3000 });
  const page = await client.newPage();
  const seenExternalIds = new Set<string>();

  try {
    const url = buildListUrl(partido);
    console.log(`[trezza] Fetching: ${url}`);

    try {
      await client.gotoRateLimited(page, url);
    } catch (err) {
      console.error(
        "[trezza] Failed to load list page:",
        err instanceof Error ? err.message : err,
      );
      result.errorCount++;
      return result;
    }

    const properties = await parseListPage(page, partido, maxProperties);
    console.log(`[trezza] Parsed ${properties.length} active venta listings`);

    // Landing exactly on the cap means the scroll was probably cut short.
    crawlEnd = properties.length >= maxProperties ? "property_cap" : "exhausted";

    for (const prop of properties) {
      if (seenExternalIds.has(prop.externalId)) continue;
      seenExternalIds.add(prop.externalId);
      result.scrapedCount++;
      try {
        const r: UpsertResult = await upsertScrapedProperty(prop);
        if (r === "inserted") result.insertedCount++;
        else if (r === "updated") result.updatedCount++;
      } catch (err) {
        console.error(
          `[trezza] Upsert failed for ${prop.externalId}:`,
          err instanceof Error ? err.message : err,
        );
        result.errorCount++;
      }
    }

    // Same rule as Zonaprop: only an exhaustive crawl may declare listings
    // gone. See ../crawl-completeness.ts.
    result.crawlEnd = crawlEnd;
    const decision = decideDeactivation(
      crawlEnd,
      result.scrapedCount,
      activeBefore,
    );
    result.deactivationReason = decision.reason;
    console.log(`[trezza] Deactivation ${decision.reason}`);

    if (decision.allowed) {
      try {
        result.deactivatedCount = await deactivateStale(
          "trezza",
          partido,
          Array.from(seenExternalIds),
        );
      } catch (err) {
        console.error(
          "[trezza] Deactivation step failed:",
          err instanceof Error ? err.message : err,
        );
        result.errorCount++;
      }
    }
  } finally {
    await client.close();
    result.durationMs = Date.now() - startedAt;
  }

  return result;
}

export { PARTIDOS_SLUGS };
