/**
 * Types shared across the scoring module.
 *
 * The quality score is a weighted blend of 5 sub-scores. Each sub-score
 * reports its own `confidence` so the total can renormalize over the
 * sub-scores that actually had data — a property without comparables doesn't
 * get penalized, the total simply reflects what we could evaluate.
 *
 * Versioning: every breakdown carries `algorithm_version` so we can detect
 * stale scores when we tweak weights or add sub-scores.
 */

export type SubScoreId =
  | "listing_quality"
  | "documentation"
  | "arba_coherence"
  | "time_on_market"
  | "price_vs_comparables";

export interface SubScore {
  id: SubScoreId;
  /** 0-100 */
  value: number;
  /** Nominal weight in the total (renormalized by confidence). */
  weight: number;
  /** 0-1. 0 = sub-score skipped (no data). 1 = full confidence. */
  confidence: number;
  /** Short human-readable explanation, for UI and debugging. */
  reason: string;
  /** Optional structured details for the admin/inspection UI. */
  details?: Record<string, unknown>;
}

export type SubScoreBody = Omit<SubScore, "id">;

export interface QualityBreakdown {
  /** Total 0-100, or null when insufficient data covered (effective weight < 30%). */
  score: number | null;
  computed_at: string;
  algorithm_version: string;
  /** Σ(weight·confidence) / Σ(weight). 1.0 = all sub-scores at full confidence. */
  effective_weight_ratio: number;
  insufficient_data: boolean;
  subscores: Record<SubScoreId, SubScoreBody>;
}

export interface PropertyForScoring {
  id: string;
  source: string;
  property_type: string | null;
  partido: string | null;
  partida: string | null;
  nomenclatura_catastral: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  price_amount: number | null;
  price_currency: "USD" | "ARS" | null;
  surface_total: number | null;
  surface_covered: number | null;
  surface_arba: number | null;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  garages: number | null;
  description: string | null;
  photos: string[];
  first_seen_at: string | null;
  last_seen_at: string | null;
  is_active: boolean;
}

export interface ArbaLookupForScoring {
  matchStrategy: "intersects" | "dwithin" | "none";
}

export interface HistoryEvent {
  changed_at: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
}

export interface ComparableStats {
  /** Median USD price per m² for active listings in the same (partido, type). */
  medianPricePerM2Usd: number | null;
  sampleSize: number;
}

export interface ScoringInput {
  property: PropertyForScoring;
  arbaLookup: ArbaLookupForScoring | null;
  history: HistoryEvent[];
  comparableStats: ComparableStats;
}

export const ALGORITHM_VERSION = "v1";

/**
 * Nominal weights for each sub-score. Sum to 100 by convention so the ratio
 * reads as "% of nominal evaluable" naturally.
 */
export const SUBSCORE_WEIGHTS: Record<SubScoreId, number> = {
  documentation: 25,
  price_vs_comparables: 25,
  listing_quality: 20,
  time_on_market: 15,
  arba_coherence: 15,
};

/**
 * Below this ratio of effective weight to nominal, we mark the score
 * as insufficient_data and persist null. We'd rather show "not enough data"
 * than a plausible-but-meaningless number.
 */
export const MIN_EFFECTIVE_WEIGHT_RATIO = 0.30;
