import { nominatimSearch } from "./nominatim";
import { readCache, writeCache } from "./cache";

/**
 * Cache-first geocoding. Public API for the rest of the codebase.
 *
 * Flow:
 *   1. Normalize the query (whitespace + casing) so equivalent inputs share a
 *      cache row.
 *   2. Read from geocoding_cache. If fresh (<90d), return it — including
 *      negative hits (lat=null/lng=null), which return null without a
 *      network call.
 *   3. On cache miss, call Nominatim (which is globally rate-limited to
 *      1 req/sec inside its module).
 *   4. Persist the result (or negative hit) so future calls skip the network.
 */

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
  /** Match granularity: 'house', 'road', 'suburb', 'city', ... */
  confidence: string | null;
  source: "cache" | "nominatim";
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Geocodes a free-text address. Returns null if Nominatim found no match.
 * Throws only on network/provider errors — a no-result is not an error.
 */
export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const key = normalizeQuery(query);
  if (key.length === 0) return null;

  const cached = await readCache(key);
  if (cached) {
    if (cached.lat === null || cached.lng === null) {
      return null;
    }
    return {
      lat: cached.lat,
      lng: cached.lng,
      displayName: cached.displayName ?? "",
      confidence: cached.confidence,
      source: "cache",
    };
  }

  const hit = await nominatimSearch(query);
  if (!hit) {
    await writeCache(key, {
      lat: null,
      lng: null,
      displayName: null,
      confidence: null,
    });
    return null;
  }

  await writeCache(key, {
    lat: hit.lat,
    lng: hit.lng,
    displayName: hit.displayName,
    confidence: hit.addresstype,
  });

  return {
    lat: hit.lat,
    lng: hit.lng,
    displayName: hit.displayName,
    confidence: hit.addresstype,
    source: "nominatim",
  };
}
