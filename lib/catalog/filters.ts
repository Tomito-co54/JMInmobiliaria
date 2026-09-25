import type { PremiumCardProperty } from "@/components/catalog/PropertyPremiumCard";
import { computeMatchScore } from "@/lib/matching/match";
import { hasAnyPreference, toSearchProfile, type MatchPreferences } from "@/lib/matching/preferences";
import type { MatchableProperty } from "@/lib/matching/types";
import { propertyTypeLabel } from "@/lib/property/types";
import { isInside, type Bounds } from "@/lib/market/geo";
import { zonaByKey } from "@/lib/zonas";

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
  MatchableProperty & {
    lat?: number | null;
    lng?: number | null;
    /** Town within the partido (migration 00022). Null until the maestra says. */
    localidad?: string | null;
    /** 'colega' marks a partner's listing (00024); see ownFirst. */
    source?: string | null;
  };

export type CatalogOperation = "venta" | "alquiler";

export interface CatalogFilters {
  /** Free text — address, zone, a word from the description. */
  q: string;
  /**
   * One of the landing's zones (lib/zonas: Buenos Aires, Córdoba, La Costa),
   * by key. What a zone cover links to. Null = anywhere.
   */
  zona: string | null;
  partido: string | null;
  /**
   * Towns within the partido — any of them. What the intro asks as
   * "ubicación" (one), and what the search board lets widen (several: Tomy,
   * 24-sep-2026). Empty = anywhere.
   */
  localidades: string[];
  /**
   * Buy, rent, or both, and the types — like the places, any of several
   * (Tomy, 24-sep-2026). The intro asks one of each; the search board widens.
   * Empty = any.
   */
  operations: CatalogOperation[];
  types: string[];
  /** A rectangle on the map. Null = anywhere. */
  area: Bounds | null;
}

export const EMPTY_CATALOG_FILTERS: CatalogFilters = {
  q: "",
  zona: null,
  partido: null,
  localidades: [],
  operations: [],
  types: [],
  area: null,
};

export function hasAnyFilter(f: CatalogFilters): boolean {
  return (
    f.q.trim() !== "" ||
    f.zona !== null ||
    f.partido !== null ||
    f.localidades.length > 0 ||
    f.operations.length > 0 ||
    f.types.length > 0 ||
    f.area !== null
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
// The filters live in the query string (?q=&partido=&loc=&op=&tipo=) so a
// filtered catalog can be sent to someone and survives the back button. Empty
// values are omitted: a clean URL for a clean catalog.

const PARAM = {
  q: "q",
  zona: "zona",
  partido: "partido",
  localidades: "loc",
  operations: "op",
  types: "tipo",
  area: "area",
} as const;

/**
 * Several values travel as one comma-separated parameter: ?loc=Banfield,Temperley,
 * ?op=venta,alquiler. A single value — every link written before 24-sep —
 * reads as a list of one. No localidad or type has a comma in its name.
 */
function listParam(raw: string | null): string[] {
  return [...new Set((raw ?? "").split(",").map((v) => v.trim()).filter(Boolean))];
}

export function filtersFromParams(params: URLSearchParams): CatalogFilters {
  return {
    q: params.get(PARAM.q) ?? "",
    // An unknown zone is no zone, not an empty catalog.
    zona: zonaByKey(params.get(PARAM.zona))?.key ?? null,
    partido: params.get(PARAM.partido) || null,
    localidades: listParam(params.get(PARAM.localidades)),
    operations: listParam(params.get(PARAM.operations)).filter(
      (o): o is CatalogOperation => o === "venta" || o === "alquiler",
    ),
    types: listParam(params.get(PARAM.types)),
    area: boundsFromParam(params.get(PARAM.area)),
  };
}

export function filtersToParams(f: CatalogFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (f.q.trim()) params.set(PARAM.q, f.q.trim());
  if (f.zona) params.set(PARAM.zona, f.zona);
  if (f.partido) params.set(PARAM.partido, f.partido);
  if (f.localidades.length > 0) params.set(PARAM.localidades, f.localidades.join(","));
  if (f.operations.length > 0) params.set(PARAM.operations, f.operations.join(","));
  if (f.types.length > 0) params.set(PARAM.types, f.types.join(","));
  if (f.area) params.set(PARAM.area, boundsToParam(f.area));
  return params;
}

// --- options ---------------------------------------------------------------

export interface CatalogOptions {
  partidos: string[];
  localidades: string[];
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
  const localidades = new Set<string>();
  const operations = new Set<CatalogOperation>();
  const types = new Set<string>();
  for (const p of list) {
    if (p.partido) partidos.add(p.partido);
    if (p.localidad) localidades.add(p.localidad);
    if (p.operation_type === "venta" || p.operation_type === "alquiler") operations.add(p.operation_type);
    if (p.property_type) types.add(p.property_type);
  }
  return {
    partidos: [...partidos].sort((a, b) => a.localeCompare(b, "es")),
    localidades: [...localidades].sort((a, b) => a.localeCompare(b, "es")),
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
  const zona = zonaByKey(f.zona);
  return list.filter((p) => {
    if (zona && !(p.partido && zona.partidos.includes(p.partido))) return false;
    if (f.partido && p.partido !== f.partido) return false;
    if (f.localidades.length > 0 && !(p.localidad && f.localidades.includes(p.localidad))) return false;
    if (f.operations.length > 0 && !(p.operation_type && (f.operations as string[]).includes(p.operation_type)))
      return false;
    if (f.types.length > 0 && !(p.property_type && f.types.includes(p.property_type))) return false;
    // A listing with no position cannot be inside any area. It is left out
    // rather than kept "just in case": the visitor drew a rectangle, and a
    // pin that is not on the map is not in it.
    if (f.area) {
      if (typeof p.lat !== "number" || typeof p.lng !== "number") return false;
      if (!isInside({ lat: p.lat, lng: p.lng }, f.area)) return false;
    }
    if (words.length === 0) return true;
    const haystack = normalizeText(
      [p.address, p.localidad, p.partido, propertyTypeLabel(p.property_type), p.description]
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

// --- ordering by the visitor's choice ----------------------------------------

/**
 * The orders the catalog offers besides its default. `null` is the default:
 * best match first when the visitor has criteria, otherwise the order the
 * page arrived in.
 *
 * Unlike the match order, a chosen order IS in the URL (?orden=): "the
 * cheapest first" is a property of the page someone sends, not of the visitor.
 */
export const CATALOG_SORTS = ["precio-asc", "precio-desc", "nuevas"] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];

const SORT_PARAM = "orden";

export function sortFromParams(params: URLSearchParams): CatalogSort | null {
  const raw = params.get(SORT_PARAM) ?? "";
  return (CATALOG_SORTS as readonly string[]).includes(raw) ? (raw as CatalogSort) : null;
}

export function sortToParams(sort: CatalogSort | null, params: URLSearchParams): void {
  if (sort) params.set(SORT_PARAM, sort);
}

/**
 * Dollars before pesos. A price order never compares across currencies: a
 * rent of 1.900.000 pesos a month is not "more expensive" than a sale of
 * 69.900 dollars, it is another scale (the rule lib/property/offers.ts
 * follows for the protagonista). So the list is grouped by currency first,
 * which in this catalog means sales, then rentals.
 */
const CURRENCY_RANK: Record<string, number> = { USD: 0, ARS: 1 };

/**
 * Re-orders an already scored list. Scores travel with their property, so a
 * card keeps its "Tu match" badge when sorted by price. Listings without the
 * sort key (no price, no year) go last rather than pretending to be zero,
 * and ties keep the order they came in.
 */
export function sortCatalog<T extends CatalogProperty>(
  list: readonly ScoredProperty<T>[],
  sort: CatalogSort | null,
): ScoredProperty<T>[] {
  if (!sort) return [...list];
  const indexed = list.map((item, index) => ({ item, index }));
  const missingLast = (a: number | null, b: number | null) =>
    a === null ? (b === null ? 0 : 1) : b === null ? -1 : 0;

  if (sort === "nuevas") {
    const year = (p: CatalogProperty) => (typeof p.year_built === "number" ? p.year_built : null);
    return indexed
      .sort((a, b) => {
        const ya = year(a.item.property);
        const yb = year(b.item.property);
        return missingLast(ya, yb) || (yb ?? 0) - (ya ?? 0) || a.index - b.index;
      })
      .map(({ item }) => item);
  }

  const dir = sort === "precio-asc" ? 1 : -1;
  const price = (p: CatalogProperty) =>
    typeof p.price_amount === "number" && p.price_amount > 0 ? p.price_amount : null;
  const rank = (p: CatalogProperty) => CURRENCY_RANK[p.price_currency ?? ""] ?? 2;
  return indexed
    .sort((a, b) => {
      const pa = a.item.property;
      const pb = b.item.property;
      const xa = price(pa);
      const xb = price(pb);
      return (
        missingLast(xa, xb) ||
        rank(pa) - rank(pb) ||
        dir * ((xa ?? 0) - (xb ?? 0)) ||
        a.index - b.index
      );
    })
    .map(({ item }) => item);
}

// --- the search, answer by answer ---------------------------------------------

/**
 * The options for operation, type and localidad, each narrowed by the answers
 * before it: the types on offer for the chosen operation, the localidades for
 * the chosen operation and type. The order is the intro's (operation → type →
 * place), and the search board uses the same one, so no chip on either leads
 * to an empty list.
 */
export function narrowedOptions(
  list: readonly CatalogProperty[],
  f: Pick<CatalogFilters, "operations" | "types">,
): Pick<CatalogOptions, "operations" | "types" | "localidades"> {
  const all = catalogOptions(list);
  const byOp = catalogOptions(applyFilters(list, { ...EMPTY_CATALOG_FILTERS, operations: f.operations }));
  const byOpType = catalogOptions(
    applyFilters(list, { ...EMPTY_CATALOG_FILTERS, operations: f.operations, types: f.types }),
  );
  return { operations: all.operations, types: byOp.types, localidades: byOpType.localidades };
}

/**
 * Drops the later answers that no longer fit after an earlier one changed:
 * switching to "Alquiler" with "Departamento" picked leaves a type with
 * nothing for rent, so the type goes back to "cualquiera" instead of
 * silently emptying the list.
 */
export function dropStaleAnswers(list: readonly CatalogProperty[], f: CatalogFilters): CatalogFilters {
  const offeredTypes = narrowedOptions(list, { operations: f.operations, types: [] }).types;
  const types = f.types.filter((t) => offeredTypes.includes(t));
  const localidades = narrowedOptions(list, { operations: f.operations, types }).localidades;
  const kept = f.localidades.filter((l) => localidades.includes(l));
  return types.length === f.types.length && kept.length === f.localidades.length
    ? f
    : { ...f, types, localidades: kept };
}

// --- the family's first ---------------------------------------------------------

/**
 * The family's listings ahead of a partner's, each group in the order it came
 * (Tomy, 23-sep-2026: "que quede marcada mi prioridad"). Applied before any
 * ordering: every order here breaks ties by arrival, so the default order
 * shows his first, and between two listings the match scores the same, his
 * wins. A chosen order (price, age) still sorts by what it names.
 */
export function ownFirst<T extends { source?: string | null }>(list: readonly T[]): T[] {
  const isPartner = (p: T) => p.source === "colega";
  return [...list.filter((p) => !isPartner(p)), ...list.filter(isPartner)];
}

/**
 * The localidades with the most published listings, most first (ties in
 * alphabetical order). The landing's line of zones is this, so it cannot go
 * stale: it used to be a hand-written list of five partidos from the old
 * coverage map, three of which the catalog barely touched.
 */
export function topLocalidades(list: readonly { localidad?: string | null }[], n: number): string[] {
  const counts = new Map<string, number>();
  for (const p of list) if (p.localidad) counts.set(p.localidad, (counts.get(p.localidad) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"))
    .slice(0, n)
    .map(([l]) => l);
}
