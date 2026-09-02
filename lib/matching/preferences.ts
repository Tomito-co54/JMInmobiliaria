import { PARTIDOS_ZONA_SUR } from "@/lib/zona-sur/partidos";
import type { SearchProfileForMatching } from "./types";

/**
 * What an anonymous visitor tells us they are looking for.
 *
 * The match score was built for `search_profiles` — a database row belonging
 * to a logged-in user who completed onboarding. This site has no public
 * registration, so that row can only ever exist for the broker. The match was
 * therefore invisible to every real visitor: the component was in the panel,
 * behind a condition nothing could satisfy.
 *
 * This is the same question asked without an account. It is deliberately
 * smaller than `SearchProfileForMatching` — six fields a visitor answers in
 * one screen, not twelve — and `toSearchProfile` widens it to the shape the
 * existing matcher already consumes. Nothing about the algorithm changes.
 *
 * Every field is optional and left unanswered means "not asked": that
 * sub-score reports zero confidence and the match renormalizes over what the
 * visitor actually expressed, instead of averaging in silent defaults.
 */
export interface MatchPreferences {
  /**
   * Buy or rent. Null = not asked.
   *
   * It is the first question a real-estate visitor answers and the only one
   * where a mismatch is disqualifying rather than costly: a renter shown a
   * sale is not looking at a worse option, they are looking at a different
   * product. `computeMatchScore` treats it that way — see the gate there.
   */
  operation: MatchOperation | null;
  /** Partidos the buyer would live in. Empty = no zone preference. */
  partidos: string[];
  /**
   * Price ceiling, expressed in the currency and cadence of `operation` —
   * dollars outright for a sale, pesos per month for a rental. The two are
   * different quantities, which is why the scale is derived rather than
   * fixed: see `priceScaleFor`. Null = no ceiling.
   */
  priceMax: number | null;
  /** Minimum rooms ("ambientes"). Null = unspecified. */
  roomsMin: number | null;
  /** Property types. Empty = any. */
  propertyTypes: string[];
  /** Minimum m² of the property itself. Null = unspecified. */
  surfaceMin: number | null;
  /**
   * Oldest building the buyer would take, in years. Null = unspecified.
   *
   * Asked as an age because that is how buyers speak, and matched against
   * `properties.year_built`, which is stored as a year because an age would
   * silently become false every January.
   */
  maxAgeYears: number | null;
}

export const EMPTY_MATCH_PREFERENCES: MatchPreferences = {
  operation: null,
  partidos: [],
  priceMax: null,
  roomsMin: null,
  propertyTypes: [],
  surfaceMin: null,
  maxAgeYears: null,
};

/** The types a buyer picks between. Mirrors the `property_type` enum. */
export const MATCH_PROPERTY_TYPES = ["casa", "departamento", "ph"] as const;

export type MatchOperation = "venta" | "alquiler";

/** The operations a visitor picks between. Mirrors the `operation_type` enum. */
export const MATCH_OPERATIONS = ["venta", "alquiler"] as const;

/**
 * The budget control, which is a different control depending on what is being
 * bought.
 *
 * A sale ceiling and a monthly rent are not the same quantity in different
 * sizes — they are different currencies, different orders of magnitude and
 * different cadences. One slider spanning both would have its entire rental
 * range compressed into its first pixel, and a stored "400.000" would mean a
 * comfortable house or an absurd rent depending on a field stored elsewhere.
 * So the scale is derived from the operation, and the number is only ever
 * read together with it.
 *
 * In both scales the top notch means "no ceiling" rather than its literal
 * value — a control pushed to its end is the absence of a constraint, and
 * scoring it as a hard limit would punish exactly the listings the visitor is
 * most relaxed about. The floor is likewise where the control starts, not a
 * claim that anything is available at that price.
 */
export interface PriceScale {
  floor: number;
  ceiling: number;
  step: number;
  currency: "USD" | "ARS";
  /** Rendered after the amount: "" for a sale, " por mes" for a rental. */
  period: string;
}

export const SALE_PRICE_SCALE: PriceScale = {
  floor: 5_000,
  ceiling: 400_000,
  step: 5_000,
  currency: "USD",
  period: "",
};

/**
 * Rents are quoted in pesos here, and the range covers what the Zona Sur
 * market actually asks per month rather than the whole span of the concept.
 */
export const RENT_PRICE_SCALE: PriceScale = {
  floor: 100_000,
  ceiling: 2_000_000,
  step: 50_000,
  currency: "ARS",
  period: " por mes",
};

/**
 * An unanswered operation gets the sale scale, because that is what this
 * catalog mostly is — not because the two are interchangeable.
 */
export function priceScaleFor(operation: MatchOperation | null): PriceScale {
  return operation === "alquiler" ? RENT_PRICE_SCALE : SALE_PRICE_SCALE;
}

/**
 * Surface floor offered by the slider, in m². The top notch means "no
 * minimum" for the same reason the price one means "no ceiling": a control
 * parked at its end is the absence of a constraint, not a constraint at the
 * end of the scale.
 *
 * The range covers what this catalog actually holds — a monoambiente at the
 * bottom, a family house at the top — rather than the whole span of real
 * estate.
 */
export const SURFACE_MIN_FLOOR = 20;
export const SURFACE_MIN_CEILING = 300;
export const SURFACE_MIN_STEP = 5;

/**
 * Age ceilings offered as chips rather than a slider. Buyers think in a few
 * coarse buckets here ("a estrenar", "algo nuevo", "no me importa"), not in
 * single years, and 0 has to be reachable exactly — "a estrenar" is a real
 * answer, and a slider makes the one value people most want the hardest to
 * land on.
 */
export const AGE_MAX_OPTIONS = [0, 10, 30, 50] as const;

/** Whether the visitor has told us anything at all. */
export function hasAnyPreference(p: MatchPreferences): boolean {
  return (
    p.operation !== null ||
    p.partidos.length > 0 ||
    p.priceMax !== null ||
    p.roomsMin !== null ||
    p.propertyTypes.length > 0 ||
    p.surfaceMin !== null ||
    p.maxAgeYears !== null
  );
}

/**
 * Widen the visitor's four answers into the profile the matcher consumes.
 *
 * Every field they did not answer is passed as null/empty on purpose: the
 * sub-scores read that as "not asked" and report `confidence: 0`, which the
 * matcher renormalizes away. So a visitor who only picks a zone gets a match
 * computed on zone alone, honestly weighted, rather than a number diluted by
 * six criteria they never expressed.
 */
export function toSearchProfile(p: MatchPreferences): SearchProfileForMatching {
  return {
    id: "local",
    name: "Tu búsqueda",
    zones: p.partidos.map((partido) => ({
      partido,
      priority: "preferido" as const,
    })),
    price_min: null,
    price_max: p.priceMax,
    // The currency is not a preference, it is a consequence: a ceiling the
    // visitor set on the rental scale is in pesos per month and comparing it
    // against a dollar sale price would be arithmetic between two different
    // things. Reading them apart is what made this a hardcoded "USD" before.
    price_currency: priceScaleFor(p.operation).currency,
    property_types: p.propertyTypes,
    operation_type: p.operation,
    rooms_min: p.roomsMin,
    surface_min: p.surfaceMin,
    max_age_years: p.maxAgeYears,
    must_haves: [],
  };
}

function asStringArray(value: unknown, allowed: readonly string[]): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const v of value) {
    if (typeof v === "string" && allowed.includes(v)) seen.add(v);
  }
  return [...seen];
}

function asBoundedNumber(
  value: unknown,
  min: number,
  max: number,
): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < min || value > max) return null;
  return value;
}

/**
 * Rebuild preferences from whatever `sessionStorage` hands back.
 *
 * Tolerant by design, and every field validated against the same lists the
 * form offers. Storage is the one input here that did not come from our own
 * UI this page load — it survived a navigation, it can be edited by hand, and
 * a stale copy can outlive a rename of the partidos. Anything unrecognised is
 * dropped rather than trusted, so the worst case is a visitor whose match
 * resets, not a profile carrying values the matcher never expected.
 */
export function parseMatchPreferences(raw: unknown): MatchPreferences {
  if (typeof raw !== "object" || raw === null) return EMPTY_MATCH_PREFERENCES;
  const o = raw as Record<string, unknown>;
  // Operation first: it decides which scale the stored ceiling is even
  // measured on. A ceiling saved under one operation is out of range under
  // the other and gets dropped, which is the intended outcome — a budget does
  // not carry from a purchase to a rent.
  const operation = (MATCH_OPERATIONS as readonly string[]).includes(
    o.operation as string,
  )
    ? (o.operation as MatchOperation)
    : null;
  const scale = priceScaleFor(operation);
  return {
    operation,
    partidos: asStringArray(o.partidos, PARTIDOS_ZONA_SUR),
    priceMax: asBoundedNumber(o.priceMax, scale.floor, scale.ceiling),
    roomsMin: asBoundedNumber(o.roomsMin, 1, 10),
    propertyTypes: asStringArray(o.propertyTypes, MATCH_PROPERTY_TYPES),
    surfaceMin: asBoundedNumber(
      o.surfaceMin,
      SURFACE_MIN_FLOOR,
      SURFACE_MIN_CEILING,
    ),
    maxAgeYears:
      typeof o.maxAgeYears === "number" &&
      (AGE_MAX_OPTIONS as readonly number[]).includes(o.maxAgeYears)
        ? o.maxAgeYears
        : null,
  };
}
