import type { PremiumCardProperty } from "@/components/catalog/PropertyPremiumCard";
import { computeMatchScore } from "@/lib/matching/match";
import { hasAnyPreference, toSearchProfile, type MatchPreferences } from "@/lib/matching/preferences";
import type { MatchableProperty } from "@/lib/matching/types";
import { propertyTypeLabel } from "@/lib/property/types";
import { isInside, type Bounds } from "@/lib/market/geo";

/**
 * What /propiedades does with the catalog once it is in the browser: narrow
 * it (a search box, a zone, buy or rent, a type) and order it by the
 * visitor's match.
 *
 * Both run client-side on the whole published list, which the page already
 * ships in full — six listings today, cheap at a few hundred. The match
 * cannot run anywhere else: the preferences live in `sessionStorage`
 * (hooks/use-match-preferences), never on the server.
 *
 * Pure, so the rules are testable: a filter that quietly drops a listing is
 * the kind of failure that looks like an empty catalog.
 */

/**
 * A catalog row: what the card paints, what the matcher scores, and where it
 * is — the position the ARBA bridge wrote from the parcel centre.
 */
export type CatalogProperty = PremiumCardProperty &
  MatchableProperty & { lat?: number | null; lng?: number | null };

export type CatalogOperation = "venta" | "alquiler";

export interface CatalogFilters {
  /** Free text — address, zone, a word from the description. */
  q: string;
  partido: string | null;
  operation: CatalogOperation | null;
  type: string | null;
  /** A rectangle on the map. Null = anywhere. */
  area: Bounds | null;
}

export const EMPTY_CATALOG_FILTERS: CatalogFilters = {
  q: "",
  partido: null,
  operation: null,
  type: null,
  area: null,
};

export function hasAnyFilter(f: CatalogFilters): boolean {
  return (
    f.q.trim() !== "" || f.partido !== null || f.operation !== null || f.type !== null || f.area !== null
  );
}

// --- the area, as text ------------------------------------------------------

/** "south,west,north,east", five decimals — about a metre, plenty for a rectangle. */
export function boundsToParam(b: Bounds): string {
  return [b.south, b.west, b.north, b.east].map((n) => n.toFixed(5)).join(",");
}

/** The inverse. Anything that is not four finite numbers in order is no area. */
export function boundsFromParam(raw: string | null): Bounds | null {
  if (!raw) return null;
  const n = raw.split(",").map(Number);
  if (n.length !== 4 || n.some((x) => !Number.isFinite(x))) return null;
  const [south, west, north, east] = n;
  if (south > north || west > east) return null;
  return { south, west, north, east };
}

/**
 * Lowercase and accent-stripped, so "Lanus" finds Lanús and "TERRAZA" finds
 * terraza. Same normalisation the matcher uses on descriptions.
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

// --- URL <-> filters --------------------------------------------------------
//
// The filters live in the query string (?q=&partido=&op=&tipo=) so a filtered
// catalog can be sent to someone and survives the back button. Empty values
// are omitted: a clean URL for a clean catalog.

const PARAM = { q: "q", partido: "partido", operation: "op", type: "tipo", area: "area" } as const;

export function filtersFromParams(params: URLSearchParams): CatalogFilters {
  const op = params.get(PARAM.operation);
  return {
    q: params.get(PARAM.q) ?? "",
    partido: params.get(PARAM.partido) || null,
    operation: op === "venta" || op === "alquiler" ? op : null,
    type: params.get(PARAM.type) || null,
    area: boundsFromParam(params.get(PARAM.area)),
  };
}

export function filtersToParams(f: CatalogFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (f.q.trim()) params.set(PARAM.q, f.q.trim());
  if (f.partido) params.set(PARAM.partido, f.partido);
  if (f.operation) params.set(PARAM.operation, f.operation);
  if (f.type) params.set(PARAM.type, f.type);
  if (f.area) params.set(PARAM.area, boundsToParam(f.area));
  return params;
}

// --- options ---------------------------------------------------------------

export interface CatalogOptions {
  partidos: string[];
  operations: CatalogOperation[];
  types: string[];
}

/**
 * The choices a filter can offer, read from the catalog itself. A control is
 * only worth drawing when it has more than one position — the same rule the
 * match form applies to "Comprar / Alquilar" — and that decision is the
 * caller's; this just says what exists.
 */
export function catalogOptions(list: readonly CatalogProperty[]): CatalogOptions {
  const partidos = new Set<string>();
  const operations = new Set<CatalogOperation>();
  const types = new Set<string>();
  for (const p of list) {
    if (p.partido) partidos.add(p.partido);
    if (p.operation_type === "venta" || p.operation_type === "alquiler") operations.add(p.operation_type);
    if (p.property_type) types.add(p.property_type);
  }
  return {
    partidos: [...partidos].sort((a, b) => a.localeCompare(b, "es")),
    operations: (["venta", "alquiler"] as const).filter((o) => operations.has(o)),
    types: [...types].sort((a, b) => a.localeCompare(b, "es")),
  };
}

// --- filtering -------------------------------------------------------------

/**
 * Narrows the catalog. Every word of the search box has to appear somewhere
 * in the listing — address, zone, type or description — so "banfield 2 amb"
 * finds a two-room unit in Banfield and "belgrano terraza" the units with
 * one. The three selectors are exact.
 */
export function applyFilters<T extends CatalogProperty>(
  list: readonly T[],
  f: CatalogFilters,
): T[] {
  const words = normalizeText(f.q).split(/\s+/).filter(Boolean);
  return list.filter((p) => {
    if (f.partido && p.partido !== f.partido) return false;
    if (f.operation && p.operation_type !== f.operation) return false;
    if (f.type && p.property_type !== f.type) return false;
    // A listing with no position cannot be inside any area. It is left out
    // rather than kept "just in case": the visitor drew a rectangle, and a
    // pin that is not on the map is not in it.
    if (f.area) {
      if (typeof p.lat !== "number" || typeof p.lng !== "number") return false;
      if (!isInside({ lat: p.lat, lng: p.lng }, f.area)) return false;
    }
    if (words.length === 0) return true;
    const haystack = normalizeText(
      [p.address, p.partido, propertyTypeLabel(p.property_type), p.description]
        .filter(Boolean)
        .join(" "),
    );
    return words.every((w) => haystack.includes(w));
  });
}

// --- ordering by match -----------------------------------------------------

export interface ScoredProperty<T> {
  property: T;
  /** Null when the visitor expressed nothing, or the listing could not be scored. */
  score: number | null;
}

/**
 * The catalog in the visitor's order: best match first, then the listings
 * that could not be scored, and last the ones on the wrong side of the
 * operation gate — a renter's sales, a buyer's rentals. Ties keep the order
 * they arrived in (proximity).
 *
 * The gate is applied here as well as in the matcher because the matcher
 * only turns a mismatch into 0 when it had a score to turn; a visitor who
 * has said nothing but "alquilar" gets null for everything, and null alone
 * would leave the sales exactly where they were. The wrong transaction sinks
 * regardless.
 *
 * When the visitor has expressed nothing the order is left alone and every
 * score is null — a ranking built on zero criteria would be an opinion
 * about nothing.
 */
export function orderByMatch<T extends MatchableProperty>(
  list: readonly T[],
  preferences: MatchPreferences,
): ScoredProperty<T>[] {
  if (!hasAnyPreference(preferences)) {
    return list.map((property) => ({ property, score: null }));
  }
  const profile = toSearchProfile(preferences);
  const gated = (p: MatchableProperty) =>
    preferences.operation !== null &&
    p.operation_type !== null &&
    p.operation_type !== preferences.operation;
  // Three tiers, then score, then arrival.
  const tier = (score: number | null, isGated: boolean) => (isGated ? 2 : score === null ? 1 : 0);
  return list
    .map((property, index) => {
      const isGated = gated(property);
      const score = isGated ? 0 : computeMatchScore(property, profile).score;
      return { property, score, index, tier: tier(score, isGated) };
    })
    .sort((a, b) => a.tier - b.tier || (b.score ?? 0) - (a.score ?? 0) || a.index - b.index)
    .map(({ property, score }) => ({ property, score }));
}
