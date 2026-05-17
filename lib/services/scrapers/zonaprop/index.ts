import { createScraperClient } from "../http-client";
import {
  upsertScrapedProperty,
  deactivateStale,
  type UpsertResult,
} from "../persistence";
import type { ScrapedProperty, ScraperRunResult } from "../types";
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
 *      as inactive (is_active = false).
 */

export interface ScrapeZonapropOptions {
  /** Partido name (must match PARTIDOS_SLUGS keys) */
  partido: string;
  /** Max number of properties to process. Default 50 (testing). */
  maxProperties?: number;
  /** Max number of pages to paginate. Default 5. */
  maxPages?: number;
  /** If true, show the browser window. Default false. */
  headed?: boolean;
}

export async function scrapeZonaprop(
  options: ScrapeZonapropOptions,
): Promise<ScraperRunResult> {
  const { partido, headed = false } = options;
  const maxProperties = options.maxProperties ?? 50;
  const maxPages = options.maxPages ?? 5;

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
  };

  const startedAt = Date.now();
  const client = await createScraperClient({ headed });
  const page = await client.newPage();
  const allScraped: ScrapedProperty[] = [];
  const seenExternalIds = new Set<string>();

  try {
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      if (allScraped.length >= maxProperties) break;

      const url = buildListUrl(partido, pageNum);
      console.log(`[zonaprop] Fetching page ${pageNum}: ${url}`);

      try {
        await client.gotoRateLimited(page, url);
      } catch (err) {
        console.error(
          `[zonaprop] Failed to load page ${pageNum}:`,
          err instanceof Error ? err.message : err,
        );
        result.errorCount++;
        break;
      }

      const properties = await parseListPage(page, partido);
      console.log(`[zonaprop] Page ${pageNum}: ${properties.length} cards found`);

      if (properties.length === 0) break;

      for (const prop of properties) {
        if (seenExternalIds.has(prop.externalId)) continue; // dedupe within run
        seenExternalIds.add(prop.externalId);
        allScraped.push(prop);
        if (allScraped.length >= maxProperties) break;
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

    // Deactivate stale (only if we got at least some results — avoids wiping
    // everything on a parser failure)
    if (allScraped.length > 0) {
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
    await client.close();
    result.durationMs = Date.now() - startedAt;
  }

  return result;
}

export { PARTIDOS_SLUGS };
