/**
 * Nominatim (OpenStreetMap) geocoding client.
 *
 * Why these constraints:
 *   - Nominatim's usage policy (https://operations.osmfoundation.org/policies/nominatim/)
 *     caps requests at 1/sec and REQUIRES a meaningful User-Agent. Going over
 *     either gets you blocked. We enforce >1.0s between calls in-process.
 *   - This module is the ONLY place that talks to nominatim.openstreetmap.org.
 *     All callers go through geocodeAddress() in ./index.ts, which adds the
 *     cache layer in front. Do not call nominatimSearch() directly from app
 *     code — it skips the cache and burns rate-limit budget.
 *   - countrycodes=ar restricts results to Argentina, eliminating false hits
 *     for common Argentine street names that also exist abroad.
 */

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

// 1.1s buffer above the 1 req/s policy to absorb local clock skew.
const MIN_INTERVAL_MS = 1100;

let lastRequestAt = 0;

export interface NominatimHit {
  lat: number;
  lng: number;
  displayName: string;
  /** Granularity of the match: 'house', 'road', 'suburb', 'city', ... */
  addresstype: string | null;
}

export class NominatimError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "NominatimError";
  }
}

interface NominatimRawResult {
  lat: string;
  lon: string;
  display_name: string;
  addresstype?: string;
}

/**
 * Direct call to Nominatim. Returns the top hit or null if no result.
 * Rate-limited globally per-process to honor 1 req/sec.
 */
export async function nominatimSearch(query: string): Promise<NominatimHit | null> {
  const wait = MIN_INTERVAL_MS - (Date.now() - lastRequestAt);
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastRequestAt = Date.now();

  const userAgent =
    process.env.SCRAPER_USER_AGENT || "JotaemeBot/1.0 (contact@jotaeme.com)";

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "ar");
  url.searchParams.set("addressdetails", "1");

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": userAgent,
      "Accept-Language": "es",
    },
  });

  if (!response.ok) {
    throw new NominatimError(
      `Nominatim returned ${response.status} ${response.statusText} for query: ${query}`,
      response.status,
    );
  }

  const data = (await response.json()) as NominatimRawResult[];
  if (!Array.isArray(data) || data.length === 0) return null;

  const top = data[0];
  const lat = parseFloat(top.lat);
  const lng = parseFloat(top.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new NominatimError(
      `Nominatim returned non-numeric coordinates: lat=${top.lat} lon=${top.lon}`,
    );
  }

  return {
    lat,
    lng,
    displayName: top.display_name,
    addresstype: top.addresstype ?? null,
  };
}
