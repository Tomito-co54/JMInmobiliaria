import { createClient } from "@/lib/supabase/server";
import type { QualityBreakdown } from "@/lib/scoring";
import type { PropertyHistoryRow } from "@/lib/db/property-history";
import {
  PUBLIC_LISTING_STATUS,
  PUBLIC_PROPERTY_SOURCES,
} from "@/lib/db/property-sources";

/**
 * Fetches a single property by ID.
 */
export async function getPropertyById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// Public property view (Block 4)
// ============================================================================

/**
 * Shape of the row returned to the public property page. Selecting explicit
 * columns rather than `*` keeps the payload tight and the type useful.
 */
export interface PublicPropertyRow {
  id: string;
  source: string;
  url: string | null;
  partido: string | null;
  partida: string | null;
  nomenclatura_catastral: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  property_type: string | null;
  operation_type: string | null;
  price_amount: number | null;
  price_currency: "USD" | "ARS" | null;
  surface_total: number | null;
  surface_covered: number | null;
  surface_arba: number | null;
  has_surface_discrepancy: boolean | null;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  garages: number | null;
  description: string | null;
  photos: string[];
  first_seen_at: string | null;
  last_seen_at: string | null;
  is_active: boolean;
  quality_score: number | null;
  quality_score_breakdown: QualityBreakdown | null;
}

export interface PublicArbaLookup {
  match_strategy: "intersects" | "dwithin" | "none";
  distance_meters: number | null;
  raw_response: unknown;
}

export interface PublicPropertyView {
  property: PublicPropertyRow;
  arbaLookup: PublicArbaLookup | null;
  history: PropertyHistoryRow[];
}

const PUBLIC_PROPERTY_COLS = [
  "id",
  "source",
  "url",
  "partido",
  "partida",
  "nomenclatura_catastral",
  "address",
  "lat",
  "lng",
  "property_type",
  "operation_type",
  "price_amount",
  "price_currency",
  "surface_total",
  "surface_covered",
  "surface_arba",
  "has_surface_discrepancy",
  "rooms",
  "bedrooms",
  "bathrooms",
  "garages",
  "description",
  "photos",
  "first_seen_at",
  "last_seen_at",
  "is_active",
  "quality_score",
  "quality_score_breakdown",
].join(", ");

/**
 * Loads everything the public property page needs in three parallel queries:
 * the property row, its ARBA lookup (if geocoded), and its history.
 *
 * Returns null when the property doesn't exist — let the caller decide
 * whether that's a notFound() or an error.
 */
export async function getPropertyForPublicView(id: string): Promise<PublicPropertyView | null> {
  const supabase = await createClient();

  const { data: rawProperty, error: propErr } = await supabase
    .from("properties")
    .select(PUBLIC_PROPERTY_COLS)
    .eq("id", id)
    // Two-gate public filter (see lib/db/property-sources.ts):
    //   - source: must be MINE (owner_direct / agency)
    //   - listing_status: must be DECIDED to show (publicada)
    .in("source", PUBLIC_PROPERTY_SOURCES as unknown as string[])
    .eq("listing_status", PUBLIC_LISTING_STATUS)
    .maybeSingle();
  if (propErr) throw propErr;
  if (!rawProperty) return null;

  const property = rawProperty as unknown as PublicPropertyRow;

  // Two independent reads — fire in parallel.
  const arbaPromise =
    property.lat !== null && property.lng !== null
      ? supabase
          .from("arba_lookups")
          .select("match_strategy, distance_meters, raw_response")
          .eq("lat", property.lat)
          .eq("lng", property.lng)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null });
  const historyPromise = supabase
    .from("property_history")
    .select("*")
    .eq("property_id", id)
    .order("changed_at", { ascending: false })
    .limit(50);

  const [arbaResult, historyResult] = await Promise.all([arbaPromise, historyPromise]);
  if (arbaResult.error) throw arbaResult.error;
  if (historyResult.error) throw historyResult.error;

  return {
    property,
    arbaLookup: (arbaResult.data ?? null) as unknown as PublicArbaLookup | null,
    history: (historyResult.data ?? []) as unknown as PropertyHistoryRow[],
  };
}

/**
 * Fetches active properties with optional filters.
 */
export async function getProperties(options?: {
  partido?: string;
  propertyType?: string;
  operationType?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("properties")
    .select("*", { count: "exact" })
    .eq("is_active", true)
    // Two-gate public filter (source = mine, listing_status = decidí mostrar).
    // Admin reads go through lib/db/admin.ts and skip these gates.
    .in("source", PUBLIC_PROPERTY_SOURCES as unknown as string[])
    .eq("listing_status", PUBLIC_LISTING_STATUS)
    .order("created_at", { ascending: false });

  if (options?.partido) {
    query = query.eq("partido", options.partido);
  }
  if (options?.propertyType) {
    query = query.eq("property_type", options.propertyType);
  }
  if (options?.operationType) {
    query = query.eq("operation_type", options.operationType);
  }

  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

/**
 * Default reference point for proximity sort when the buyer has no
 * search profile yet. Roughly the geographic center of our service
 * area (Zona Sur GBA — close to the Lomas / Lanús partido border).
 * Used by the home catalog and any other anon listing surface that
 * wants "near me" ordering without asking for geolocation.
 */
export const ZONA_SUR_CENTER = {
  lat: -34.762,
  lng: -58.4,
} as const;

/**
 * Fetch active properties sorted by Euclidean distance from a reference
 * point. Properties without coordinates fall to the bottom.
 *
 * For the small dataset we work with (50-500 properties), fetching all
 * active rows and sorting in JS is simpler than building an RPC. If
 * the catalog grows past a few thousand active rows this will need to
 * move to a Postgres function using ST_Distance.
 */
export async function getPropertiesByProximity(
  ref: { lat: number; lng: number },
  options?: { limit?: number },
) {
  const supabase = await createClient();
  const { data, error, count } = await supabase
    .from("properties")
    .select("*", { count: "exact" })
    .eq("is_active", true)
    // Two-gate public filter (source = mine, listing_status = decidí mostrar).
    .in("source", PUBLIC_PROPERTY_SOURCES as unknown as string[])
    .eq("listing_status", PUBLIC_LISTING_STATUS);
  if (error) throw error;

  const limit = options?.limit ?? 20;
  const rows = (data ?? []) as Array<{ lat: number | null; lng: number | null }>;

  // Adjust lng span by cos(lat) so 1 unit of lng is visually equivalent
  // to 1 unit of lat — without this, distances near the equator are
  // overweighted in longitude. Negligible at this scale but cheap and
  // correct.
  const cosLat = Math.cos((ref.lat * Math.PI) / 180);

  const sorted = rows
    .map((p, i) => {
      const hasCoords = typeof p.lat === "number" && typeof p.lng === "number";
      const dlng = hasCoords ? ((p.lng as number) - ref.lng) * cosLat : 0;
      const dlat = hasCoords ? (p.lat as number) - ref.lat : 0;
      // Push uncoordinated rows after every coordinated one by giving
      // them an effectively-infinite distance.
      const d2 = hasCoords ? dlat * dlat + dlng * dlng : Number.POSITIVE_INFINITY;
      return { row: rows[i], d2 };
    })
    .sort((a, b) => a.d2 - b.d2)
    .slice(0, limit)
    .map((r) => r.row);

  return { data: sorted, count: count ?? 0 };
}

/**
 * Counts properties by status (for admin dashboard).
 */
export async function getPropertyCounts() {
  const supabase = await createClient();

  const [activeResult, totalResult] = await Promise.all([
    supabase
      .from("properties")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("properties")
      .select("*", { count: "exact", head: true }),
  ]);

  return {
    active: activeResult.count ?? 0,
    total: totalResult.count ?? 0,
    inactive: (totalResult.count ?? 0) - (activeResult.count ?? 0),
  };
}
