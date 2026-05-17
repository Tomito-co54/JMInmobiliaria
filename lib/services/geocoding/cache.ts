import { getAdminClient } from "./client";

/**
 * Read/write helpers for the geocoding_cache table.
 *
 * A row with lat=null and lng=null is a "negative" cache entry — the query
 * was tried but produced no result. We still keep it so we don't burn
 * rate-limit budget retrying obviously bad addresses.
 *
 * TTL is enforced here (in app code), not by a DB constraint, so we can
 * tune it without a migration.
 */

const PROVIDER = "nominatim";
const CACHE_TTL_DAYS = 90;
const CACHE_TTL_MS = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;

export interface CachedEntry {
  lat: number | null;
  lng: number | null;
  displayName: string | null;
  confidence: string | null;
  createdAt: Date;
}

interface CacheRow {
  lat: number | null;
  lng: number | null;
  display_name: string | null;
  confidence: string | null;
  created_at: string;
}

/**
 * Looks up a cached geocoding result. Returns null on cache miss OR if the
 * cached entry is older than CACHE_TTL_DAYS (treated as a miss so we refetch).
 */
export async function readCache(query: string): Promise<CachedEntry | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("geocoding_cache")
    .select("lat, lng, display_name, confidence, created_at")
    .eq("provider", PROVIDER)
    .eq("query", query)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as CacheRow;
  const createdAt = new Date(row.created_at);
  if (Date.now() - createdAt.getTime() > CACHE_TTL_MS) {
    return null;
  }

  return {
    lat: row.lat,
    lng: row.lng,
    displayName: row.display_name,
    confidence: row.confidence,
    createdAt,
  };
}

export interface CacheWriteInput {
  lat: number | null;
  lng: number | null;
  displayName: string | null;
  confidence: string | null;
}

/**
 * Upserts a result into the cache. Pass nulls for lat/lng to record a
 * negative cache hit. Resets created_at so the TTL window restarts.
 */
export async function writeCache(query: string, result: CacheWriteInput): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("geocoding_cache")
    .upsert(
      {
        provider: PROVIDER,
        query,
        lat: result.lat,
        lng: result.lng,
        display_name: result.displayName,
        confidence: result.confidence,
        created_at: new Date().toISOString(),
      } as never,
      { onConflict: "provider,query" },
    );
  if (error) throw error;
}
