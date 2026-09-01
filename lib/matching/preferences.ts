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
 * smaller than `SearchProfileForMatching` — four fields a visitor answers in
 * one screen, not eleven — and `toSearchProfile` widens it to the shape the
 * existing matcher already consumes. Nothing about the algorithm changes.
 *
 * Notably absent: surface. Asking a buyer for a minimum m² invites the
 * comparison this codebase keeps getting wrong (the ARBA parcel is the whole
 * building's lot, not the unit), and it is the field a buyer is least sure
 * about anyway. Left unanswered, its sub-score reports zero confidence and
 * the match renormalizes over what was actually asked.
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
}

export const EMPTY_MATCH_PREFERENCES: MatchPreferences = {
  partidos: [],
  priceMax: null,
  roomsMin: null,
  propertyTypes: [],
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
 */
export const PRICE_MAX_FLOOR = 40_000;
export const PRICE_MAX_CEILING = 400_000;
export const PRICE_MAX_STEP = 5_000;

/** Whether the visitor has told us anything at all. */
export function hasAnyPreference(p: MatchPreferences): boolean {
  return (
    p.partidos.length > 0 ||
    p.priceMax !== null ||
    p.roomsMin !== null ||
    p.propertyTypes.length > 0
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
    surface_min: null,
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
  };
}
