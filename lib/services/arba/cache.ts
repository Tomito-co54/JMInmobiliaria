import { getAdminClient } from "./client";
import type { ParcelResult } from "./wfs";

/**
 * Read/write helpers for arba_lookups.
 *
 * A row with partida=null is a negative cache entry — the (lat,lng) point
 * was queried but no parcel was found within the search radius. We keep these
 * so re-runs of the enrichment CLI don't pound ARBA for unmatchable points.
 *
 * TTL is 180 days (enforced here, not in DB). Cadastral data turns slowly
 * (subdivisions, escrituras) — far slower than scraping cadence, so a long
 * TTL is the right default.
 */

const CACHE_TTL_DAYS = 180;
const CACHE_TTL_MS = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;

export interface CachedLookup {
  partida: string | null;
  nomenclatura: string | null;
  surfaceArba: number | null;
  tipo: string | null;
  matchStrategy: "intersects" | "dwithin" | "none";
  distanceMeters: number | null;
  createdAt: Date;
}

interface CacheRow {
  partida: string | null;
  nomenclatura: string | null;
  surface_arba: number | null;
  tipo: string | null;
  match_strategy: "intersects" | "dwithin" | "none";
  distance_meters: number | null;
  created_at: string;
}

export async function readLookupCache(
  lat: number,
  lng: number,
): Promise<CachedLookup | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("arba_lookups")
    .select("partida, nomenclatura, surface_arba, tipo, match_strategy, distance_meters, created_at")
    .eq("lat", lat)
    .eq("lng", lng)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as CacheRow;
  const createdAt = new Date(row.created_at);
  if (Date.now() - createdAt.getTime() > CACHE_TTL_MS) {
    return null;
  }

  return {
    partida: row.partida,
    nomenclatura: row.nomenclatura,
    surfaceArba: row.surface_arba,
    tipo: row.tipo,
    matchStrategy: row.match_strategy,
    distanceMeters: row.distance_meters,
    createdAt,
  };
}

/**
 * Upserts a lookup result. Pass `result = null` to record a negative cache
 * hit (no parcel found within radius). Resets created_at so the TTL window
 * restarts.
 */
export async function writeLookupCache(
  lat: number,
  lng: number,
  result: ParcelResult | null,
): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("arba_lookups")
    .upsert(
      {
        lat,
        lng,
        partida: result?.partida ?? null,
        nomenclatura: result?.nomenclatura ?? null,
        surface_arba: result?.surfaceM2 ?? null,
        tipo: result?.tipo ?? null,
        match_strategy: result?.matchStrategy ?? "none",
        distance_meters: result?.distanceMeters ?? null,
        raw_response: result?.rawResponse ?? null,
        created_at: new Date().toISOString(),
      } as never,
      { onConflict: "lat,lng" },
    );
  if (error) throw error;
}
