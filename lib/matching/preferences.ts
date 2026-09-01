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
  /** Partidos the buyer would live in. Empty = no zone preference. */
  partidos: string[];
  /** Ceiling in USD. Null = no ceiling. */
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
  partidos: [],
  priceMax: null,
  roomsMin: null,
  propertyTypes: [],
  surfaceMin: null,
  maxAgeYears: null,
};

/** The types a buyer picks between. Mirrors the `property_type` enum. */
export const MATCH_PROPERTY_TYPES = ["casa", "departamento", "ph"] as const;

/**
 * Price ceilings offered by the slider, in USD.
 *
 * The top value means "no ceiling" rather than "up to 400k" — a buyer who
 * pushes the control to its end is saying price is not their constraint, and
 * scoring that as a hard 400k limit would punish exactly the listings they
 * are most relaxed about.
 *
 * The floor is 5k rather than a plausible entry price. It is not a claim that
 * anything sells for that: it is where the control starts, and starting it
 * above the cheapest thing a visitor might hope for makes the first drag feel
 * like an argument.
 */
export const PRICE_MAX_FLOOR = 5_000;
export const PRICE_MAX_CEILING = 400_000;
export const PRICE_MAX_STEP = 5_000;

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
    // The catalog is USD-priced end to end; offering a currency toggle would
    // be a control with one real position.
    price_currency: "USD",
    property_types: p.propertyTypes,
    // Not asked: the public catalog is sale-only, so an operation question
    // would have a single answer. Null keeps the sub-score out of the maths
    // instead of awarding a free 100.
    operation_type: null,
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
  return {
    partidos: asStringArray(o.partidos, PARTIDOS_ZONA_SUR),
    priceMax: asBoundedNumber(o.priceMax, PRICE_MAX_FLOOR, PRICE_MAX_CEILING),
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
