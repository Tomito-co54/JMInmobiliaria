import { createClient } from "@supabase/supabase-js";
import { normalizeAddress, type NormalizedAddress } from "./normalize";

/**
 * Property deduplication matcher.
 *
 * Strategies (in order of precedence):
 *   1. partida           — exact ARBA cadastral ID (will be added with B2.3)
 *   2. geo               — coords within ~20m (will be added with B2.4)
 *   3. fuzzy_address     — normalized street+number+partido signature ← only one implemented now
 *
 * Idempotent: re-running won't create duplicate groups. Properties already
 * in a group keep their group; new properties matching that group's signature
 * are added to it.
 */

let cachedAdminClient: ReturnType<typeof createClient> | null = null;
function getAdminClient() {
  if (cachedAdminClient) return cachedAdminClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  cachedAdminClient = createClient(url, key, { auth: { persistSession: false } });
  return cachedAdminClient;
}

interface PropertyRow {
  id: string;
  source: string;
  external_id: string | null;
  address: string | null;
  partido: string | null;
  property_type: string | null;
  property_group_id: string | null;
  surface_total: number | null;
  description: string | null;
  photos: unknown;
  last_seen_at: string | null;
}

/**
 * Property types where street address is enough to identify the physical unit
 * uniquely. Departamentos are excluded: many units share an address, so
 * fuzzy-matching them by address alone collapses distinct sales.
 */
const ADDRESS_IDENTIFIES_UNIT = new Set(["casa", "ph", "lote", "local"]);

export interface DedupResult {
  totalScanned: number;
  withSignature: number;
  groupsCreated: number;
  groupsUpdated: number;
  listingsAdded: number;
}

export async function runFuzzyAddressDedup(): Promise<DedupResult> {
  const supabase = getAdminClient();

  // Fetch all active properties with their group status
  const { data, error } = await supabase
    .from("properties")
    .select(
      "id, source, external_id, address, partido, property_type, property_group_id, surface_total, description, photos, last_seen_at",
    )
    .eq("is_active", true);

  if (error) throw error;
  const properties = (data ?? []) as PropertyRow[];

  const result: DedupResult = {
    totalScanned: properties.length,
    withSignature: 0,
    groupsCreated: 0,
    groupsUpdated: 0,
    listingsAdded: 0,
  };

  // Bucket properties by their normalized signature
  const bucketsBySignature = new Map<
    string,
    Array<{ row: PropertyRow; normalized: NormalizedAddress }>
  >();

  for (const row of properties) {
    // Address-based fuzzy matching is only reliable for property types where
    // the street address uniquely identifies the physical unit.
    if (!row.property_type || !ADDRESS_IDENTIFIES_UNIT.has(row.property_type)) {
      continue;
    }
    const normalized = normalizeAddress(row.address, row.partido);
    if (!normalized) continue;
    result.withSignature++;

    const bucket = bucketsBySignature.get(normalized.signature) ?? [];
    bucket.push({ row, normalized });
    bucketsBySignature.set(normalized.signature, bucket);
  }

  // For each bucket with 2+ listings, ensure they share a property_group_id
  for (const [signature, bucket] of bucketsBySignature) {
    if (bucket.length < 2) continue;

    // Determine the group to use. Prefer an existing group if any listing
    // already belongs to one (handles re-runs after a new listing is added).
    const existingGroupId = bucket
      .map((b) => b.row.property_group_id)
      .find((id): id is string => !!id);

    let groupId: string;
    let isNewGroup = false;
    if (existingGroupId) {
      groupId = existingGroupId;
      result.groupsUpdated++;
    } else {
      // Pick the "best" listing as primary: most complete (longest description),
      // tie-break by most recent last_seen_at.
      const primary = pickPrimary(bucket.map((b) => b.row));

      // The Supabase JS client doesn't have schema types generated yet (B2.x todo).
      // Cast the insert payload so TS doesn't widen it to `never`.
      const { data: created, error: insertError } = await supabase
        .from("property_groups")
        .insert({
          signature,
          matched_by: "fuzzy_address",
          primary_listing_id: primary.id,
        } as never)
        .select("id")
        .single();

      if (insertError) {
        console.error(`Failed to create group for ${signature}:`, insertError.message);
        continue;
      }
      groupId = (created as { id: string }).id;
      isNewGroup = true;
      result.groupsCreated++;
    }

    // Assign group_id to every listing in the bucket that doesn't have it
    const toUpdate = bucket
      .filter((b) => b.row.property_group_id !== groupId)
      .map((b) => b.row.id);

    if (toUpdate.length > 0) {
      const { error: updateError } = await supabase
        .from("properties")
        .update({ property_group_id: groupId } as never)
        .in("id", toUpdate);
      if (updateError) {
        console.error(
          `Failed to assign group ${groupId} to ${toUpdate.length} listings:`,
          updateError.message,
        );
        continue;
      }
      result.listingsAdded += toUpdate.length;
    }

    // For brand-new groups, the primary was already set. For existing groups,
    // recompute primary if the bucket grew (best listing might have changed).
    if (!isNewGroup) {
      const primary = pickPrimary(bucket.map((b) => b.row));
      await supabase
        .from("property_groups")
        .update({ primary_listing_id: primary.id } as never)
        .eq("id", groupId);
    }
  }

  return result;
}

/**
 * Pick the "best" listing as the primary representative of a group.
 *   - Most complete (longest non-null description wins)
 *   - Tie-break: most recently seen
 */
function pickPrimary(rows: PropertyRow[]): PropertyRow {
  return [...rows].sort((a, b) => {
    const aDesc = a.description?.length ?? 0;
    const bDesc = b.description?.length ?? 0;
    if (aDesc !== bDesc) return bDesc - aDesc;
    const aSeen = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0;
    const bSeen = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0;
    return bSeen - aSeen;
  })[0];
}
