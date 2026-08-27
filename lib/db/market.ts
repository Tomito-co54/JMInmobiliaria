import { createClient } from "@/lib/supabase/server";
import { usdPerM2, median, type MarketRow } from "@/lib/market/stats";

/**
 * Market-intelligence queries (/admin/mercado). These read the COMPLEMENT
 * of the public two-door filter: the scraped inventory only
 * (source NOT IN owner_direct/agency). This is private market intel — it
 * must never surface the broker's own listings, and conversely the public
 * surfaces never touch this set.
 *
 * Admin-only at the route level (app/admin/layout.tsx gates the segment).
 *
 * Scale note: with ~100 scraped rows we fetch everything and aggregate in
 * JS (mirrors getPropertiesByProximity). When the scraped set grows past a
 * few thousand, move the aggregation into a Postgres view / RPC.
 */

const OWNER_SOURCES = ["owner_direct", "agency"];
const NOT_OWNER = `(${OWNER_SOURCES.map((s) => `"${s}"`).join(",")})`;

const MARKET_COLS = [
  "id",
  "source",
  "partido",
  "property_type",
  "operation_type",
  "price_amount",
  "price_currency",
  "surface_total",
  "surface_arba",
  "rooms",
  "quality_score",
  "lat",
  "lng",
  "address",
  "url",
  "is_active",
  "first_seen_at",
  "last_seen_at",
].join(", ");

/** All scraped rows for the dashboard (active + inactive). */
export async function getScrapedInventory(): Promise<MarketRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select(MARKET_COLS)
    .not("source", "in", NOT_OWNER)
    .order("last_seen_at", { ascending: false })
    .range(0, 9999);
  if (error) throw error;
  return (data ?? []) as unknown as MarketRow[];
}

export interface RawHistoryRow {
  id: string;
  property_id: string;
  changed_at: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  /** Price the listing carried when the change happened. Null before 00014. */
  price_at_change: number | string | null;
  price_currency_at_change: string | null;
}

/**
 * Recent property_history rows (most recent first). The caller filters to
 * scraped properties by intersecting property_id with the inventory map —
 * the history table itself doesn't carry the source.
 */
export async function getRecentPropertyHistory(limit = 300): Promise<RawHistoryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("property_history")
    .select(
      "id, property_id, changed_at, field_changed, old_value, new_value, price_at_change, price_currency_at_change",
    )
    .order("changed_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as RawHistoryRow[];
}

/**
 * Median USD/m² per property type across the scraped market.
 *
 * Used as the yardstick for colouring a listing's price: "expensive" only
 * means anything next to what comparable properties ask. Reads the scraped
 * set on purpose — the broker's own listings are what's being measured, so
 * they can't also be the ruler.
 *
 * Selects four columns rather than reusing getScrapedInventory(), which
 * pulls eighteen: this runs on a paginated list page and shouldn't cost more
 * than the rows it decorates.
 */
export async function getUsdPerM2MediansByType(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select("property_type, price_amount, price_currency, surface_total")
    .not("source", "in", NOT_OWNER)
    .range(0, 9999);
  if (error) throw error;

  const groups = new Map<string, number[]>();
  for (const raw of (data ?? []) as unknown as MarketRow[]) {
    const v = usdPerM2(raw);
    if (v === null) continue;
    const key = raw.property_type ?? "(sin tipo)";
    const list = groups.get(key) ?? [];
    list.push(v);
    groups.set(key, list);
  }

  const out: Record<string, number> = {};
  for (const [type, values] of groups) {
    const m = median(values);
    if (m !== null) out[type] = m;
  }
  return out;
}
