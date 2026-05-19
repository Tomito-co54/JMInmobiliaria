import { createClient } from "@/lib/supabase/server";
import type { SearchProfileForMatching } from "@/lib/matching";

/**
 * Read/write helpers for `search_profiles`.
 *
 * RLS (set in migration 00001) restricts every operation to the row's own
 * user — these helpers run through the user-bound server client, so a user
 * can never read or mutate someone else's profile. The 2-profile cap for
 * free users is enforced here (createSearchProfile counts first).
 *
 * The shape returned by getX methods is `SearchProfileForMatching` so they
 * can be passed straight into `computeMatchScore` without a translation
 * layer.
 */

const FREE_TIER_PROFILE_LIMIT = 2;

const COLS = [
  "id",
  "user_id",
  "name",
  "zones",
  "price_min",
  "price_max",
  "price_currency",
  "property_types",
  "operation_type",
  "rooms_min",
  "surface_min",
  "must_haves",
  "is_primary",
  "created_at",
  "updated_at",
].join(", ");

interface RawProfileRow {
  id: string;
  user_id: string;
  name: string;
  zones: unknown;
  price_min: number | string | null;
  price_max: number | string | null;
  price_currency: "USD" | "ARS";
  property_types: string[] | null;
  operation_type: "venta" | "alquiler" | null;
  rooms_min: number | null;
  surface_min: number | string | null;
  must_haves: string[] | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface SearchProfileRow extends SearchProfileForMatching {
  user_id: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

function toNumber(v: number | string | null): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeZones(raw: unknown): SearchProfileRow["zones"] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((z) => {
    if (!z || typeof z !== "object") return [];
    const obj = z as { partido?: unknown; priority?: unknown };
    if (typeof obj.partido !== "string") return [];
    const p =
      obj.priority === "preferido" ||
      obj.priority === "aceptable" ||
      obj.priority === "descarte"
        ? obj.priority
        : "preferido";
    return [{ partido: obj.partido, priority: p }];
  });
}

function rowToProfile(row: RawProfileRow): SearchProfileRow {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    zones: normalizeZones(row.zones),
    price_min: toNumber(row.price_min),
    price_max: toNumber(row.price_max),
    price_currency: row.price_currency,
    property_types: row.property_types ?? [],
    operation_type: row.operation_type,
    rooms_min: row.rooms_min,
    surface_min: toNumber(row.surface_min),
    must_haves: row.must_haves ?? [],
    is_primary: row.is_primary,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Reads
//
// All buyer-facing reads filter explicitly by user_id (not just RLS). Why:
// migration 00002 added an admin SELECT policy on search_profiles ("admins
// can read all"), which means an admin user querying through these helpers
// would see *every* profile in the DB. That's fine for /admin pages but
// wrong for /busquedas, /dashboard, /onboarding, /p/[id], etc. — those
// surfaces always mean "current user's profile(s)". An explicit user_id
// filter keeps the scope right for both roles.
// ---------------------------------------------------------------------------

async function currentAuthUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function getUserSearchProfiles(): Promise<SearchProfileRow[]> {
  const userId = await currentAuthUserId();
  if (!userId) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("search_profiles")
    .select(COLS)
    .eq("user_id", userId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as RawProfileRow[]).map(rowToProfile);
}

/**
 * Primary profile for the current user. Falls back to the first profile if
 * none is marked primary (which can happen for legacy rows).
 */
export async function getPrimarySearchProfile(): Promise<SearchProfileRow | null> {
  const userId = await currentAuthUserId();
  if (!userId) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("search_profiles")
    .select(COLS)
    .eq("user_id", userId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToProfile(data as unknown as RawProfileRow);
}

export async function getSearchProfileById(id: string): Promise<SearchProfileRow | null> {
  const userId = await currentAuthUserId();
  if (!userId) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("search_profiles")
    .select(COLS)
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToProfile(data as unknown as RawProfileRow);
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export interface SearchProfileInput {
  name: string;
  zones: SearchProfileForMatching["zones"];
  price_min: number | null;
  price_max: number | null;
  price_currency: "USD" | "ARS";
  property_types: string[];
  operation_type: "venta" | "alquiler" | null;
  rooms_min: number | null;
  surface_min: number | null;
  must_haves: string[];
  is_primary?: boolean;
}

export class SearchProfileLimitError extends Error {
  constructor() {
    super(`Llegaste al máximo de ${FREE_TIER_PROFILE_LIMIT} perfiles de búsqueda.`);
    this.name = "SearchProfileLimitError";
  }
}

export async function createSearchProfile(
  userId: string,
  input: SearchProfileInput,
): Promise<SearchProfileRow> {
  const supabase = await createClient();

  // Free-tier limit (2 profiles). When subscriptions land in Block 7, this
  // will read the user's tier and bump the cap accordingly.
  const { count, error: countError } = await supabase
    .from("search_profiles")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (countError) throw countError;
  if ((count ?? 0) >= FREE_TIER_PROFILE_LIMIT) {
    throw new SearchProfileLimitError();
  }

  const shouldBePrimary = input.is_primary ?? (count ?? 0) === 0;

  if (shouldBePrimary) {
    // Clear any existing primary flag — only one primary per user.
    await supabase
      .from("search_profiles")
      .update({ is_primary: false } as never)
      .eq("user_id", userId)
      .eq("is_primary", true);
  }

  const { data, error } = await supabase
    .from("search_profiles")
    .insert({
      user_id: userId,
      name: input.name,
      zones: input.zones,
      price_min: input.price_min,
      price_max: input.price_max,
      price_currency: input.price_currency,
      property_types: input.property_types,
      operation_type: input.operation_type,
      rooms_min: input.rooms_min,
      surface_min: input.surface_min,
      must_haves: input.must_haves,
      is_primary: shouldBePrimary,
    } as never)
    .select(COLS)
    .single();
  if (error) throw error;
  return rowToProfile(data as unknown as RawProfileRow);
}

export async function updateSearchProfile(
  id: string,
  userId: string,
  input: SearchProfileInput,
): Promise<SearchProfileRow> {
  const supabase = await createClient();

  // Only touch is_primary when the caller explicitly sets it. Editing the
  // name / zones / price / etc. should NOT silently demote a primary
  // profile to non-primary — earlier versions of this function used
  // `is_primary: input.is_primary ?? false`, which is exactly that bug.
  if (input.is_primary === true) {
    await supabase
      .from("search_profiles")
      .update({ is_primary: false } as never)
      .eq("user_id", userId)
      .eq("is_primary", true)
      .neq("id", id);
  }

  const updatePayload: Record<string, unknown> = {
    name: input.name,
    zones: input.zones,
    price_min: input.price_min,
    price_max: input.price_max,
    price_currency: input.price_currency,
    property_types: input.property_types,
    operation_type: input.operation_type,
    rooms_min: input.rooms_min,
    surface_min: input.surface_min,
    must_haves: input.must_haves,
  };
  if (typeof input.is_primary === "boolean") {
    updatePayload.is_primary = input.is_primary;
  }

  const { data, error } = await supabase
    .from("search_profiles")
    .update(updatePayload as never)
    .eq("id", id)
    .select(COLS)
    .single();
  if (error) throw error;
  return rowToProfile(data as unknown as RawProfileRow);
}

export async function deleteSearchProfile(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("search_profiles").delete().eq("id", id);
  if (error) throw error;
}

export async function setPrimarySearchProfile(
  id: string,
  userId: string,
): Promise<void> {
  const supabase = await createClient();
  // Unset others first.
  await supabase
    .from("search_profiles")
    .update({ is_primary: false } as never)
    .eq("user_id", userId)
    .eq("is_primary", true)
    .neq("id", id);
  // Set this one.
  const { error } = await supabase
    .from("search_profiles")
    .update({ is_primary: true } as never)
    .eq("id", id);
  if (error) throw error;
}

export { FREE_TIER_PROFILE_LIMIT };
