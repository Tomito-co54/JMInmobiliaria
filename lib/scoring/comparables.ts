import { getAdminClient } from "./client";
import type { ComparableStats } from "./types";

/**
 * Builds per-(partido, property_type) comparable statistics from active listings.
 *
 * Why median over mean: real estate prices are right-skewed (a few luxury
 * outliers pull the mean up); median is robust to that.
 *
 * Why USD only: ~all our active listings are in USD already; the few ARS
 * outliers can't be converted reliably without a daily official rate, and
 * the cohort would be too small to be useful anyway.
 *
 * Surface preference: surface_arba (ARBA-verified) over surface_total
 * (declared). When we have the verified number, comparing price/m² against
 * it is more honest than comparing against what the publisher decided to claim.
 */

interface ComparableRow {
  price_amount: number | string;
  surface_arba: number | string | null;
  surface_total: number | string | null;
}

interface ComparableRowWithKeys {
  partido: string | null;
  property_type: string | null;
  price_amount: number | string;
  surface_arba: number | string | null;
  surface_total: number | string | null;
}

function median(sortedAsc: number[]): number {
  if (sortedAsc.length === 0) throw new Error("median: empty array");
  const mid = Math.floor(sortedAsc.length / 2);
  if (sortedAsc.length % 2 === 1) return sortedAsc[mid];
  return (sortedAsc[mid - 1] + sortedAsc[mid]) / 2;
}

function pricePerM2(row: ComparableRow): number | null {
  const surfaceRaw = row.surface_arba ?? row.surface_total ?? null;
  if (surfaceRaw === null) return null;
  const surface = typeof surfaceRaw === "number" ? surfaceRaw : parseFloat(surfaceRaw);
  if (!Number.isFinite(surface) || surface <= 0) return null;
  const priceRaw = row.price_amount;
  const price = typeof priceRaw === "number" ? priceRaw : parseFloat(priceRaw);
  if (!Number.isFinite(price) || price <= 0) return null;
  return price / surface;
}

/**
 * Looks up the comparable stats for a single (partido, property_type) pair.
 * Use the batch cache (`ComparablesCache.warmUp`) when scoring more than one
 * property; this single-shot version is for ad-hoc recomputes.
 */
export async function getComparableStats(
  partido: string | null,
  propertyType: string | null,
): Promise<ComparableStats> {
  if (!partido || !propertyType) return { medianPricePerM2Usd: null, sampleSize: 0 };
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("properties")
    .select("price_amount, surface_arba, surface_total")
    .eq("is_active", true)
    .eq("partido", partido)
    .eq("property_type", propertyType)
    .eq("price_currency", "USD")
    .not("price_amount", "is", null);
  if (error) throw error;
  const samples: number[] = [];
  for (const row of (data ?? []) as unknown as ComparableRow[]) {
    const p = pricePerM2(row);
    if (p !== null) samples.push(p);
  }
  if (samples.length === 0) return { medianPricePerM2Usd: null, sampleSize: 0 };
  samples.sort((a, b) => a - b);
  return { medianPricePerM2Usd: median(samples), sampleSize: samples.length };
}

/**
 * Pre-fetches comparable stats for every (partido, property_type) cluster
 * in one query. Use this when scoring properties in batch so we avoid N+1
 * round-trips against Supabase.
 */
export class ComparablesCache {
  private cache = new Map<string, ComparableStats>();
  private warmed = false;

  private key(partido: string, propertyType: string): string {
    return `${partido}|${propertyType}`;
  }

  async warmUp(): Promise<void> {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("properties")
      .select("partido, property_type, price_amount, surface_arba, surface_total")
      .eq("is_active", true)
      .eq("price_currency", "USD")
      .not("price_amount", "is", null);
    if (error) throw error;

    const groups = new Map<string, number[]>();
    for (const row of (data ?? []) as unknown as ComparableRowWithKeys[]) {
      if (!row.partido || !row.property_type) continue;
      const p = pricePerM2(row);
      if (p === null) continue;
      const key = this.key(row.partido, row.property_type);
      let arr = groups.get(key);
      if (!arr) {
        arr = [];
        groups.set(key, arr);
      }
      arr.push(p);
    }
    for (const [key, samples] of groups) {
      samples.sort((a, b) => a - b);
      this.cache.set(key, {
        medianPricePerM2Usd: median(samples),
        sampleSize: samples.length,
      });
    }
    this.warmed = true;
  }

  get(partido: string | null, propertyType: string | null): ComparableStats {
    if (!this.warmed) {
      throw new Error("ComparablesCache.get called before warmUp()");
    }
    if (!partido || !propertyType) return { medianPricePerM2Usd: null, sampleSize: 0 };
    return (
      this.cache.get(this.key(partido, propertyType)) ?? {
        medianPricePerM2Usd: null,
        sampleSize: 0,
      }
    );
  }

  /** For diagnostics / CLI summary printing. */
  entries(): Array<{ partido: string; propertyType: string; stats: ComparableStats }> {
    const out: Array<{ partido: string; propertyType: string; stats: ComparableStats }> = [];
    for (const [key, stats] of this.cache) {
      const [partido, propertyType] = key.split("|");
      out.push({ partido, propertyType, stats });
    }
    return out;
  }
}
