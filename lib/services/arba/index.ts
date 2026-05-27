import { getParcelByPoint, type ParcelResult } from "./wfs";
import { readLookupCache, writeLookupCache } from "./cache";

/**
 * Cache-first ARBA parcel lookup. Public API for the rest of the codebase.
 *
 * Flow:
 *   1. Read arba_lookups for the exact (lat, lng). If fresh (<180d), return it
 *      — including negative hits (partida=null), which return null with no
 *      network call.
 *   2. On cache miss, hit ARBA's WFS (rate-limited internally to 1 req/sec).
 *   3. Persist the result (or negative hit) for future calls.
 */

export interface LookupResult {
  /** Null when ARBA's parcela has no fiscal ID attached (rare). */
  partida: string | null;
  nomenclatura: string;
  surfaceM2: number | null;
  tipo: string | null;
  /**
   * The geo lookup path only emits the first two — `by_partida` is reserved
   * for the by-partida bridge and shows up here only via the shared
   * ParcelResult type from wfs.ts. At runtime lookupParcel() never returns
   * `by_partida`; keeping the union wide just avoids a cast.
   */
  matchStrategy: "intersects" | "dwithin" | "by_partida";
  distanceMeters: number;
  source: "cache" | "arba";
}

export async function lookupParcel(
  lat: number,
  lng: number,
): Promise<LookupResult | null> {
  const cached = await readLookupCache(lat, lng);
  if (cached) {
    // 'none' = negative hit (no parcel found within radius). A row with
    // partida=null but nomenclatura set is a real parcel with no fiscal ID —
    // still a hit, return it.
    if (cached.matchStrategy === "none" || cached.nomenclatura === null) {
      return null;
    }
    return {
      partida: cached.partida,
      nomenclatura: cached.nomenclatura,
      surfaceM2: cached.surfaceArba,
      tipo: cached.tipo,
      matchStrategy: cached.matchStrategy,
      distanceMeters: cached.distanceMeters ?? 0,
      source: "cache",
    };
  }

  const parcel: ParcelResult | null = await getParcelByPoint(lat, lng);
  await writeLookupCache(lat, lng, parcel);
  if (!parcel) return null;

  return {
    partida: parcel.partida,
    nomenclatura: parcel.nomenclatura,
    surfaceM2: parcel.surfaceM2,
    tipo: parcel.tipo,
    matchStrategy: parcel.matchStrategy,
    distanceMeters: parcel.distanceMeters,
    source: "arba",
  };
}
