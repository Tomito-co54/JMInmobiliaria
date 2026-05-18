/**
 * Types for the match score module.
 *
 * The match score is the *subjective* counterpart to the quality score:
 * given a property and a user's search profile, how well does this
 * property fit *that user*? Same property → different score per user.
 *
 * Algorithm shape mirrors the quality score (sub-scores with confidence,
 * renormalization) so admin tooling, tests, and breakdown UIs can reuse
 * the same mental model.
 */

export type MatchSubScoreId =
  | "zone"
  | "price"
  | "type"
  | "operation"
  | "rooms"
  | "surface"
  | "must_haves";

export interface MatchSubScore {
  id: MatchSubScoreId;
  /** 0-100. */
  value: number;
  /** Nominal weight. */
  weight: number;
  /** 0-1. 0 means the sub-score was skipped (e.g. profile didn't set a min). */
  confidence: number;
  /** Buyer-facing short explanation. */
  reason: string;
  /** Verdict for the breakdown UI. */
  verdict: "fulfilled" | "partial" | "unfulfilled";
}

export type MatchSubScoreBody = Omit<MatchSubScore, "id">;

export interface MatchBreakdown {
  /** 0-100, or null when no sub-score was applicable. */
  score: number | null;
  computed_at: string;
  algorithm_version: string;
  effective_weight_ratio: number;
  /** True when fewer than 30% of nominal weight could be evaluated. */
  insufficient_data: boolean;
  subscores: Record<MatchSubScoreId, MatchSubScoreBody>;
}

export type ZonePriority = "preferido" | "aceptable" | "descarte";

export interface ZonePref {
  partido: string;
  priority: ZonePriority;
}

export interface SearchProfileForMatching {
  id: string;
  name: string;
  zones: ZonePref[];
  price_min: number | null;
  price_max: number | null;
  price_currency: "USD" | "ARS";
  /** Empty array = no type preference. */
  property_types: string[];
  /** Null = no operation preference. */
  operation_type: "venta" | "alquiler" | null;
  rooms_min: number | null;
  surface_min: number | null;
  /** Free-form tags: "cochera", "patio", "balcon", etc. */
  must_haves: string[];
}

export interface PropertyForMatching {
  partido: string | null;
  property_type: string | null;
  operation_type: string | null;
  price_amount: number | null;
  price_currency: "USD" | "ARS" | null;
  rooms: number | null;
  bedrooms: number | null;
  surface_total: number | null;
  surface_arba: number | null;
  garages: number | null;
  description: string | null;
}

export const MATCH_ALGORITHM_VERSION = "v1";

/**
 * Nominal weights. Sum to 100 by convention. Adjust here when the design
 * iterates — every downstream component reads from this constant.
 */
export const MATCH_SUBSCORE_WEIGHTS: Record<MatchSubScoreId, number> = {
  zone: 25,
  price: 25,
  type: 15,
  operation: 10,
  rooms: 10,
  surface: 10,
  must_haves: 5,
};

export const MATCH_MIN_EFFECTIVE_WEIGHT_RATIO = 0.30;
