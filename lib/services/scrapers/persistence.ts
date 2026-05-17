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

type TrackedField = (typeof TRACKED_FIELDS)[number];

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

  // Look up existing row
  const { data: existing, error: lookupError } = await supabase
    .from("properties")
    .select("*")
    .eq("source", scraped.source)
    .eq("external_id", scraped.externalId)
    .maybeSingle();

  if (lookupError) throw lookupError;

  if (!existing) {
    // INSERT
    const { error: insertError } = await supabase.from("properties").insert({
      ...newRow,
      first_seen_at: now,
      last_seen_at: now,
      is_active: true,
    });
    if (insertError) throw insertError;
    return "inserted";
  }

  // Diff tracked fields
  const changes: { field: TrackedField; oldValue: string | null; newValue: string | null }[] = [];
  for (const field of TRACKED_FIELDS) {
    const oldNorm = normalizeForComparison(existing[field]);
    const newNorm = normalizeForComparison(newRow[field as keyof typeof newRow]);
    if (oldNorm !== newNorm) {
      changes.push({ field, oldValue: oldNorm, newValue: newNorm });
    }
  }

  // Always update last_seen_at and mark active (even if unchanged)
  const { error: updateError } = await supabase
    .from("properties")
    .update({
      ...newRow,
      last_seen_at: now,
      is_active: true,
    })
    .eq("id", existing.id);
  if (updateError) throw updateError;

  // Record changes in history
  if (changes.length > 0) {
    const historyRows = changes.map((c) => ({
      property_id: existing.id as string,
      changed_at: now,
      field_changed: c.field,
      old_value: c.oldValue,
      new_value: c.newValue,
    }));
    const { error: histError } = await supabase
      .from("property_history")
      .insert(historyRows);
    if (histError) {
      // Don't fail the upsert if history fails — just log
      console.error(`History insert failed for ${scraped.externalId}:`, histError.message);
    }
    return "updated";
  }

  return "unchanged";
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
    .select("id, external_id")
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

  const { data: toDeactivate, error: selectError } = await query;
  if (selectError) throw selectError;
  if (!toDeactivate || toDeactivate.length === 0) return 0;

  const ids = toDeactivate.map((r) => r.id);

  const { error: updateError } = await supabase
    .from("properties")
    .update({ is_active: false, last_seen_at: now })
    .in("id", ids);
  if (updateError) throw updateError;

  // Record deactivation in history
  const historyRows = toDeactivate.map((r) => ({
    property_id: r.id as string,
    changed_at: now,
    field_changed: "is_active",
    old_value: "true",
    new_value: "false",
  }));
  await supabase.from("property_history").insert(historyRows);

  return toDeactivate.length;
}
