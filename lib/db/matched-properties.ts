import { createClient } from "@/lib/supabase/server";
import {
  computeMatchScore,
  type MatchBreakdown,
  type PropertyForMatching,
  type SearchProfileForMatching,
} from "@/lib/matching";
import type { QualityBreakdown } from "@/lib/scoring";

/**
 * Compute matches between the user's search profile and all active
 * properties. Sorts best-match-first and drops the "No encaja" (score <26)
 * unless the caller explicitly opts in.
 *
 * Why server-side and not precomputed: with ~hundreds of active
 * properties and a profile per user, computing on the fly is microseconds
 * per property — total ~50ms for a typical request. When we grow to
 * thousands of users it'll be worth caching, not before.
 *
 * Filters NARROW the profile (intersection, never widen). The page can
 * surface them as query-string controlled chips. To widen, the user must
 * edit their profile.
 */

const MIN_MATCH_TO_SHOW = 26;

export interface MatchedPropertyFilters {
  /** Restrict to a subset of the profile's property types. */
  propertyType?: string;
  /** Tighten the upper bound on price (in the profile's currency). */
  priceMax?: number;
  /** Tighten the rooms floor (in addition to the profile's rooms_min). */
  roomsMin?: number;
  /** When true, include "No encaja" matches too (for inspection / admin). */
  includeNoFit?: boolean;
}

export interface MatchedPropertyRow {
  id: string;
  partido: string | null;
  property_type: string | null;
  operation_type: string | null;
  price_amount: number | null;
  price_currency: "USD" | "ARS" | null;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  surface_total: number | null;
  surface_arba: number | null;
  garages: number | null;
  address: string | null;
  photos: string[];
  description: string | null;
  quality_score: number | null;
  quality_score_breakdown: QualityBreakdown | null;
  first_seen_at: string | null;
  source: string;
}

export interface MatchedProperty {
  property: MatchedPropertyRow;
  match: MatchBreakdown;
}

const PROPERTY_COLS = [
  "id",
  "partido",
  "property_type",
  "operation_type",
  "price_amount",
  "price_currency",
  "rooms",
  "bedrooms",
  "bathrooms",
  "surface_total",
  "surface_arba",
  "garages",
  "address",
  "photos",
  "description",
  "quality_score",
  "quality_score_breakdown",
  "first_seen_at",
  "source",
].join(", ");

function rowToPropertyForMatching(row: MatchedPropertyRow): PropertyForMatching {
  return {
    partido: row.partido,
    property_type: row.property_type,
    operation_type: row.operation_type,
    price_amount: row.price_amount,
    price_currency: row.price_currency,
    rooms: row.rooms,
    bedrooms: row.bedrooms,
    surface_total: row.surface_total,
    surface_arba: row.surface_arba,
    garages: row.garages,
    description: row.description,
  };
}

export async function getMatchedProperties(
  profile: SearchProfileForMatching,
  filters: MatchedPropertyFilters = {},
): Promise<MatchedProperty[]> {
  const supabase = await createClient();

  let query = supabase
    .from("properties")
    .select(PROPERTY_COLS)
    .eq("is_active", true);

  // Push as much filtering as we can to the DB before computing match —
  // the in-memory pass is cheap, but loading rows we'd drop anyway isn't.
  if (filters.propertyType) {
    query = query.eq("property_type", filters.propertyType);
  } else if (profile.property_types.length > 0) {
    query = query.in("property_type", profile.property_types);
  }

  if (profile.operation_type !== null) {
    // Strict filter — alquileres no aparecen para perfiles de venta. The
    // sub-score would mark it "unfulfilled" anyway; dropping at DB level
    // saves cycles and keeps the list focused.
    query = query.eq("operation_type", profile.operation_type);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as unknown as MatchedPropertyRow[];

  const matched: MatchedProperty[] = rows
    .map((row) => {
      const match = computeMatchScore(rowToPropertyForMatching(row), profile);
      return { property: row, match };
    })
    .filter(({ match, property }) => {
      // Apply caller-side narrowing filters.
      if (filters.priceMax !== undefined && property.price_amount !== null) {
        if (property.price_amount > filters.priceMax) return false;
      }
      if (filters.roomsMin !== undefined && property.rooms !== null) {
        if (property.rooms < filters.roomsMin) return false;
      }
      // Drop the "No encaja" band unless caller opts in.
      if (!filters.includeNoFit) {
        if (match.score === null) return true; // keep insufficient_data shown
        if (match.score < MIN_MATCH_TO_SHOW) return false;
      }
      return true;
    })
    .sort((a, b) => {
      // Best matches first. Insufficient (null) sort to the end.
      if (a.match.score === null && b.match.score === null) return 0;
      if (a.match.score === null) return 1;
      if (b.match.score === null) return -1;
      return b.match.score - a.match.score;
    });

  return matched;
}
