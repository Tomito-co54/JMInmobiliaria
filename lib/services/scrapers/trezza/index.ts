import { createScraperClient } from "../http-client";
import {
  upsertScrapedProperty,
  deactivateStale,
  type UpsertResult,
} from "../persistence";
import type { ScraperRunResult } from "../types";
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
  /** Max number of properties to process. Default 100 (covers most partidos). */
  maxProperties?: number;
  /** Show browser window (debugging). Default false. */
  headed?: boolean;
}

export async function scrapeTrezza(
  options: ScrapeTrezzaOptions,
): Promise<ScraperRunResult> {
  const { partido, headed = false } = options;
  const maxProperties = options.maxProperties ?? 100;

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
  };

  const startedAt = Date.now();
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

    // Deactivate stale Trezza properties in this partido (only if we got results)
    if (result.scrapedCount > 0) {
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
