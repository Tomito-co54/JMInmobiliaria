/**
 * Market-intelligence statistics — pure functions, no I/O.
 *
 * These operate on the SCRAPED inventory (the complement of the public
 * two-door filter) to power /admin/mercado. Kept pure so they're unit-
 * testable and reusable across server components and future scripts.
 *
 * Design notes (grounded in the current dataset — ~100 scraped rows, ~2
 * weeks of history, USD-dominant, Lomas-dominant):
 *   - Prefer the MEDIAN over the mean (small, skewed samples).
 *   - Prefer surface_arba (real cadastral m²) over the declared surface.
 *   - Only USD-priced rows enter USD/m² stats (the set is ~100% USD; ARS
 *     rows, if any, would distort the distribution).
 */

export interface MarketRow {
  id: string;
  source: string;
  partido: string | null;
  property_type: string | null;
  operation_type: string | null;
  price_amount: number | null;
  price_currency: string | null;
  surface_total: number | null;
  surface_arba: number | null;
  rooms: number | null;
  quality_score: number | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  url: string | null;
  is_active: boolean;
  first_seen_at: string | null;
  last_seen_at: string | null;
}

/** PostgREST can hand back `numeric` columns as strings — coerce safely. */
function num(x: unknown): number | null {
  if (x === null || x === undefined || x === "") return null;
  const n = typeof x === "number" ? x : Number(x);
  return Number.isFinite(n) ? n : null;
}

export type SurfaceSource = "arba" | "declared";

/**
 * The surface we use for analysis: ARBA cadastral m² when present (the real
 * number), otherwise the declared total. Returns which source was used so
 * the UI can label it honestly.
 */
export function effectiveSurface(
  row: Pick<MarketRow, "surface_arba" | "surface_total">,
): { value: number | null; source: SurfaceSource | null } {
  const arba = num(row.surface_arba);
  if (arba !== null && arba > 0) return { value: arba, source: "arba" };
  const declared = num(row.surface_total);
  if (declared !== null && declared > 0) return { value: declared, source: "declared" };
  return { value: null, source: null };
}

/**
 * USD per m². Null unless the row is USD-priced AND has a usable surface.
 */
export function usdPerM2(
  row: Pick<MarketRow, "price_amount" | "price_currency" | "surface_arba" | "surface_total">,
): number | null {
  if (row.price_currency !== "USD") return null;
  const price = num(row.price_amount);
  if (price === null || price <= 0) return null;
  const { value } = effectiveSurface(row);
  if (value === null) return null;
  return price / value;
}

/** Days the listing has been observed alive (last_seen − first_seen). */
export function daysOnMarket(
  row: Pick<MarketRow, "first_seen_at" | "last_seen_at">,
): number | null {
  if (!row.first_seen_at || !row.last_seen_at) return null;
  const first = new Date(row.first_seen_at).getTime();
  const last = new Date(row.last_seen_at).getTime();
  if (!Number.isFinite(first) || !Number.isFinite(last)) return null;
  return Math.max(0, Math.round((last - first) / 86_400_000));
}

// ---------------------------------------------------------------------------
// Descriptive statistics over a list of numbers
// ---------------------------------------------------------------------------

export function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Linear-interpolated percentile. p in [0,1]. */
export function percentile(xs: number[], p: number): number | null {
  if (xs.length === 0) return null;
  if (xs.length === 1) return xs[0];
  const s = [...xs].sort((a, b) => a - b);
  const idx = (s.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return s[lo];
  return s[lo] + (s[hi] - s[lo]) * (idx - lo);
}

export function mean(xs: number[]): number | null {
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Sample standard deviation (n−1). Null for n < 2. */
export function stdev(xs: number[]): number | null {
  if (xs.length < 2) return null;
  const m = mean(xs) as number;
  const variance = xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(variance);
}

export interface UsdM2Summary {
  n: number;
  median: number | null;
  p25: number | null;
  p75: number | null;
  mean: number | null;
  stdev: number | null;
  min: number | null;
  max: number | null;
}

export function summarize(values: number[]): UsdM2Summary {
  return {
    n: values.length,
    median: median(values),
    p25: percentile(values, 0.25),
    p75: percentile(values, 0.75),
    mean: mean(values),
    stdev: stdev(values),
    min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null,
  };
}

// ---------------------------------------------------------------------------
// USD/m² distribution by property type
// ---------------------------------------------------------------------------

export interface TypeDistribution {
  /** property_type key, or "(sin tipo)" for nulls. */
  type: string;
  summary: UsdM2Summary;
}

/**
 * Groups USD/m² by property type. Rows without a computable USD/m² are
 * dropped from the stats (but the caller can still count them elsewhere).
 * Sorted by sample size desc so the most-backed buckets lead.
 */
export function distributionByType(rows: MarketRow[]): {
  overall: UsdM2Summary;
  byType: TypeDistribution[];
} {
  const groups = new Map<string, number[]>();
  const all: number[] = [];
  for (const row of rows) {
    const v = usdPerM2(row);
    if (v === null) continue;
    all.push(v);
    const key = row.property_type ?? "(sin tipo)";
    const list = groups.get(key) ?? [];
    list.push(v);
    groups.set(key, list);
  }
  const byType = [...groups.entries()]
    .map(([type, values]) => ({ type, summary: summarize(values) }))
    .sort((a, b) => b.summary.n - a.summary.n);
  return { overall: summarize(all), byType };
}

// ---------------------------------------------------------------------------
// KPIs (coverage of the scraped dataset)
// ---------------------------------------------------------------------------

export interface MarketKpis {
  total: number;
  active: number;
  inactive: number;
  bySource: Record<string, number>;
  withPrice: number;
  withUsdPerM2: number;
  geocoded: number;
}

export function computeKpis(rows: MarketRow[]): MarketKpis {
  const bySource: Record<string, number> = {};
  let active = 0;
  let withPrice = 0;
  let withUsdPerM2 = 0;
  let geocoded = 0;
  for (const row of rows) {
    bySource[row.source] = (bySource[row.source] ?? 0) + 1;
    if (row.is_active) active += 1;
    if (num(row.price_amount) !== null) withPrice += 1;
    if (usdPerM2(row) !== null) withUsdPerM2 += 1;
    if (num(row.lat) !== null && num(row.lng) !== null) geocoded += 1;
  }
  return {
    total: rows.length,
    active,
    inactive: rows.length - active,
    bySource,
    withPrice,
    withUsdPerM2,
    geocoded,
  };
}

// ---------------------------------------------------------------------------
// Change-feed classification (from property_history)
// ---------------------------------------------------------------------------

export type ChangeKind =
  | "price_drop"
  | "price_rise"
  | "delisted"
  | "relisted"
  | "type_change"
  | "other";

export interface HistoryEntry {
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
}

export function classifyChange(h: HistoryEntry): ChangeKind {
  if (h.field_changed === "price_amount") {
    const o = num(h.old_value);
    const n = num(h.new_value);
    if (o !== null && n !== null) {
      if (n < o) return "price_drop";
      if (n > o) return "price_rise";
    }
    return "other";
  }
  if (h.field_changed === "is_active") {
    if (h.old_value === "true" && h.new_value === "false") return "delisted";
    if (h.old_value === "false" && h.new_value === "true") return "relisted";
  }
  if (h.field_changed === "property_type") return "type_change";
  return "other";
}

/** Percent price delta for a price change (negative = drop). Null if N/A. */
export function priceDeltaPct(h: HistoryEntry): number | null {
  if (h.field_changed !== "price_amount") return null;
  const o = num(h.old_value);
  const n = num(h.new_value);
  if (o === null || n === null || o === 0) return null;
  return ((n - o) / o) * 100;
}
