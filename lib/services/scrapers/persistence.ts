import { createClient } from "@supabase/supabase-js";
import type { ScrapedProperty } from "./types";

/**
 * Persistence layer for scrapers. Uses the service_role key to bypass RLS
 * (writes happen server-side as part of the scraper, not from a user request).
 *
 * Each call to `upsertScrapedProperty`:
 *   1. Looks up existing row by (source, external_id)
 *   2. If not present -> INSERT, returns 'inserted'
 *   3. If present -> compare fields, UPDATE the row, INSERT diffs into
 *      property_history, returns 'updated' or 'unchanged'
 *   4. Always sets last_seen_at = now() and is_active = true
 */

export type UpsertResult = "inserted" | "updated" | "unchanged";

/** Fields we diff when checking if a scraped property changed. */
const TRACKED_FIELDS = [
  "price_amount",
  "price_currency",
  "address",
  "partido",
  "property_type",
  "operation_type",
  "surface_total",
  "surface_covered",
  "rooms",
  "bedrooms",
  "bathrooms",
  "garages",
  "description",
] as const;

// Singleton: avoids re-creating the Supabase client (and its internal fetch
// agent) for every upsert in a scraper run.
let cachedAdminClient: ReturnType<typeof createClient> | null = null;

function getAdminClient() {
  if (cachedAdminClient) return cachedAdminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env",
    );
  }
  cachedAdminClient = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
  return cachedAdminClient;
}

/**
 * Map a ScrapedProperty (camelCase) into the DB shape (snake_case).
 */
function toDbRow(s: ScrapedProperty) {
  return {
    source: s.source,
    external_id: s.externalId,
    url: s.url,
    partido: s.partido ?? null,
    address: s.address ?? null,
    property_type: s.propertyType ?? null,
    operation_type: s.operationType ?? "venta",
    price_amount: s.priceAmount ?? null,
    price_currency: s.priceCurrency ?? null,
    surface_total: s.surfaceTotal ?? null,
    surface_covered: s.surfaceCovered ?? null,
    rooms: s.rooms ?? null,
    bedrooms: s.bedrooms ?? null,
    bathrooms: s.bathrooms ?? null,
    garages: s.garages ?? null,
    description: s.description ?? null,
    photos: s.photos ?? [],
  };
}

function normalizeForComparison(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return String(value);
  return String(value);
}

export async function upsertScrapedProperty(
  scraped: ScrapedProperty,
): Promise<UpsertResult> {
  const supabase = getAdminClient();
  const newRow = toDbRow(scraped);
  const now = new Date().toISOString();

  // Look up existing row. Result is cast to a permissive shape because we
  // don't ship generated Database types yet (B2.x todo).
  const { data: existingRaw, error: lookupError } = await supabase
    .from("properties")
    .select("*")
    .eq("source", scraped.source)
    .eq("external_id", scraped.externalId)
    .maybeSingle();

  if (lookupError) throw lookupError;
  const existing = existingRaw as (Record<string, unknown> & { id: string }) | null;

  if (!existing) {
    // INSERT
    const { error: insertError } = await supabase.from("properties").insert({
      ...newRow,
      first_seen_at: now,
      last_seen_at: now,
      is_active: true,
    } as never);
    if (insertError) throw insertError;
    return "inserted";
  }

  // Diff tracked fields. The field name is widened to string because
  // `is_active` is appended below without being a diffable column — it is
  // derived from the row's previous state, not from comparing scraped values.
  const changes: { field: string; oldValue: string | null; newValue: string | null }[] = [];
  for (const field of TRACKED_FIELDS) {
    const oldNorm = normalizeForComparison(existing[field]);
    const newNorm = normalizeForComparison(newRow[field as keyof typeof newRow]);
    if (oldNorm !== newNorm) {
      changes.push({ field, oldValue: oldNorm, newValue: newNorm });
    }
  }

  // A listing coming back from inactive is a real market event — the posting
  // was gone (or we thought it was) and it is live again. `deactivateStale`
  // writes the way down, but the way back up used to happen silently here,
  // because `is_active` isn't a tracked field. The result was a history with
  // 477 delistings and zero relistings, and a `classifyChange` "relisted"
  // branch that could never fire.
  const wasInactive = existing.is_active === false;

  // Always update last_seen_at and mark active (even if unchanged)
  const { error: updateError } = await supabase
    .from("properties")
    .update({
      ...newRow,
      last_seen_at: now,
      is_active: true,
    } as never)
    .eq("id", existing.id);
  if (updateError) throw updateError;

  if (wasInactive) {
    changes.push({ field: "is_active", oldValue: "false", newValue: "true" });
  }

  // Record changes in history
  if (changes.length > 0) {
    // Same snapshot as on the way out, so a relisting carries the price it
    // came back at. With both rows the pair reads on its own: left at
    // USD 120.000, returned at USD 105.000.
    const historyRows = changes.map((c) => ({
      property_id: existing.id as string,
      changed_at: now,
      field_changed: c.field,
      old_value: c.oldValue,
      new_value: c.newValue,
      price_at_change:
        newRow.price_amount === null || newRow.price_amount === undefined
          ? null
          : Number(newRow.price_amount),
      price_currency_at_change: newRow.price_currency ?? null,
    }));
    const { error: histError } = await supabase
      .from("property_history")
      .insert(historyRows as never);
    if (histError) {
      // Don't fail the upsert if history fails — just log
      console.error(`History insert failed for ${scraped.externalId}:`, histError.message);
    }
    return "updated";
  }

  return "unchanged";
}

/**
 * How many listings this source+partido currently holds active.
 *
 * Read *before* a crawl touches anything, so it is the baseline the run's
 * coverage is judged against (see crawl-completeness.ts). Taken after the
 * upsert loop it would be useless: the loop reactivates everything it saw,
 * which is precisely the number under suspicion.
 */
export async function countActiveListings(
  source: ScrapedProperty["source"],
  partido: string,
): Promise<number> {
  const supabase = getAdminClient();
  const { count, error } = await supabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("source", source)
    .eq("partido", partido)
    .eq("is_active", true);
  if (error) throw error;
  return count ?? 0;
}

/**
 * Marks properties as inactive if they weren't seen in the latest run.
 * Returns the number of properties deactivated.
 */
export async function deactivateStale(
  source: ScrapedProperty["source"],
  partido: string,
  seenExternalIds: string[],
): Promise<number> {
  const supabase = getAdminClient();
  const now = new Date().toISOString();

  // Find properties for this source+partido that are currently active
  // but were NOT seen in this run
  let query = supabase
    .from("properties")
    .select("id, external_id, price_amount, price_currency")
    .eq("source", source)
    .eq("partido", partido)
    .eq("is_active", true);

  // If we saw any, exclude them
  if (seenExternalIds.length > 0) {
    query = query.not(
      "external_id",
      "in",
      `(${seenExternalIds.map((id) => `"${id}"`).join(",")})`,
    );
  }

  const { data: toDeactivateRaw, error: selectError } = await query;
  if (selectError) throw selectError;
  const toDeactivate = (toDeactivateRaw ?? []) as Array<{
    id: string;
    external_id: string | null;
    price_amount: number | string | null;
    price_currency: string | null;
  }>;
  if (toDeactivate.length === 0) return 0;

  const ids = toDeactivate.map((r) => r.id);

  const { error: updateError } = await supabase
    .from("properties")
    .update({ is_active: false, last_seen_at: now } as never)
    .in("id", ids);
  if (updateError) throw updateError;

  // Record deactivation in history, with the price the listing carried when
  // it left. "When did this go" is half the question; a broker wants to know
  // at what number it stopped, because an ad that disappears after two cuts
  // reads very differently from one that disappears at asking price.
  const historyRows = toDeactivate.map((r) => ({
    property_id: r.id as string,
    changed_at: now,
    field_changed: "is_active",
    old_value: "true",
    new_value: "false",
    price_at_change: r.price_amount === null ? null : Number(r.price_amount),
    price_currency_at_change: r.price_currency,
  }));
  await supabase.from("property_history").insert(historyRows as never);

  return toDeactivate.length;
}
