import { createClient } from "@/lib/supabase/server";

/**
 * Helpers for reading and summarizing `property_history`.
 *
 * The table is append-only: every scrape that detects a value change for a
 * tracked field (price, address, surface, etc.) inserts one row. is_active
 * transitions are also recorded as field_changed='is_active'.
 *
 * These helpers are pure read paths — they don't mutate. Writes happen
 * exclusively from the scrapers in lib/services/scrapers/persistence.ts.
 */

export interface PropertyHistoryRow {
  id: string;
  property_id: string;
  changed_at: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
}

/**
 * Returns the most-recent N history rows for a property, newest first.
 */
export async function getPropertyHistory(
  propertyId: string,
  limit: number = 100,
): Promise<PropertyHistoryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("property_history")
    .select("*")
    .eq("property_id", propertyId)
    .order("changed_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as PropertyHistoryRow[];
}

/**
 * Subset of price-change events only. Returns newest first.
 */
export function filterPriceChanges(history: PropertyHistoryRow[]): PropertyHistoryRow[] {
  return history.filter((h) => h.field_changed === "price_amount");
}

export interface PriceChangeSummary {
  changedAt: Date;
  oldAmount: number;
  newAmount: number;
  /** new - old. Negative = price drop. */
  diff: number;
  /** (new - old) / old. Decimal (e.g. -0.05 for a 5% drop). null if oldAmount = 0. */
  pctChange: number | null;
}

/**
 * Most-recent price change (or null if the price never changed since first
 * scrape). Uses the diff already stored in history rather than computing
 * against the current property row, so it reflects the price *transition*,
 * not the current price.
 */
export function lastPriceChange(history: PropertyHistoryRow[]): PriceChangeSummary | null {
  const priceEvents = filterPriceChanges(history);
  if (priceEvents.length === 0) return null;
  const latest = priceEvents[0];
  const oldAmount = parseFloat(latest.old_value ?? "");
  const newAmount = parseFloat(latest.new_value ?? "");
  if (!Number.isFinite(oldAmount) || !Number.isFinite(newAmount)) return null;
  const diff = newAmount - oldAmount;
  const pctChange = oldAmount !== 0 ? diff / oldAmount : null;
  return {
    changedAt: new Date(latest.changed_at),
    oldAmount,
    newAmount,
    diff,
    pctChange,
  };
}

/**
 * Days the listing has been visible to us. Uses first_seen_at as the start
 * and last_seen_at (if inactive) or now (if active) as the end.
 *
 * This is days-tracked-by-us, NOT days-on-market in the real sense — Zonaprop
 * may have had the listing for months before we noticed. Still useful as a
 * lower bound and to flag listings stuck on our index for too long.
 */
export interface DaysOnMarketInput {
  first_seen_at: string | null;
  last_seen_at: string | null;
  is_active: boolean | null;
}

export function computeDaysOnMarket(property: DaysOnMarketInput): number | null {
  if (!property.first_seen_at) return null;
  const start = new Date(property.first_seen_at).getTime();
  const endRaw =
    property.is_active === false && property.last_seen_at
      ? new Date(property.last_seen_at).getTime()
      : Date.now();
  if (!Number.isFinite(start)) return null;
  const days = Math.floor((endRaw - start) / (24 * 60 * 60 * 1000));
  return Math.max(0, days);
}

export type HistoryEventKind =
  | "price_change"
  | "deactivated"
  | "reactivated"
  | "address_change"
  | "surface_change"
  | "other";

/**
 * Classify a history row into a coarse event kind for UI grouping.
 * Pure — no DB access.
 */
export function classifyHistoryEvent(row: PropertyHistoryRow): HistoryEventKind {
  if (row.field_changed === "price_amount") return "price_change";
  if (row.field_changed === "is_active") {
    return row.new_value === "false" ? "deactivated" : "reactivated";
  }
  if (row.field_changed === "address") return "address_change";
  if (row.field_changed === "surface_total" || row.field_changed === "surface_covered") {
    return "surface_change";
  }
  return "other";
}
