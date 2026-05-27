import { createClient } from "@/lib/supabase/server";

/**
 * Aggregated counts for the admin dashboard.
 * Returns 0 for any count that fails (so the dashboard never crashes
 * just because one table is empty or RLS denies a row).
 */
export async function getDashboardMetrics() {
  const supabase = await createClient();

  const lastMonth = new Date();
  lastMonth.setDate(lastMonth.getDate() - 30);
  const sinceISO = lastMonth.toISOString();

  const [
    propertiesTotal,
    propertiesActive,
    usersTotal,
    favoritesLastMonth,
    serviceOrdersLastMonth,
  ] = await Promise.all([
    supabase.from("properties").select("*", { count: "exact", head: true }),
    supabase
      .from("properties")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase
      .from("favorites")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sinceISO),
    supabase
      .from("service_orders")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sinceISO),
  ]);

  return {
    properties: {
      total: propertiesTotal.count ?? 0,
      active: propertiesActive.count ?? 0,
      inactive: (propertiesTotal.count ?? 0) - (propertiesActive.count ?? 0),
    },
    usersTotal: usersTotal.count ?? 0,
    favoritesLast30Days: favoritesLastMonth.count ?? 0,
    serviceOrdersLast30Days: serviceOrdersLastMonth.count ?? 0,
  };
}

/**
 * Paginated property list for the admin table, with optional filters.
 */
export interface AdminPropertyFilters {
  search?: string;
  partido?: string;
  propertyType?: string;
  status?: "all" | "active" | "inactive";
  page?: number;
  pageSize?: number;
}

export async function getPropertiesAdmin(filters: AdminPropertyFilters = {}) {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("properties")
    .select(
      "id, address, partido, property_type, operation_type, price_amount, price_currency, rooms, surface_total, is_active, listing_status, quality_score, first_seen_at, last_seen_at, source",
      { count: "exact" },
    )
    .order("last_seen_at", { ascending: false });

  if (filters.search && filters.search.trim() !== "") {
    const q = `%${filters.search.trim()}%`;
    query = query.or(`address.ilike.${q},partido.ilike.${q}`);
  }
  if (filters.partido) {
    query = query.eq("partido", filters.partido);
  }
  if (filters.propertyType) {
    query = query.eq("property_type", filters.propertyType);
  }
  if (filters.status === "active") {
    query = query.eq("is_active", true);
  } else if (filters.status === "inactive") {
    query = query.eq("is_active", false);
  }

  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    rows: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
  };
}

/**
 * Full property row + history for the admin detail view.
 */
export async function getPropertyDetailAdmin(id: string) {
  const supabase = await createClient();

  const [propertyResult, historyResult] = await Promise.all([
    supabase.from("properties").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("property_history")
      .select("*")
      .eq("property_id", id)
      .order("changed_at", { ascending: false })
      .limit(50),
  ]);

  if (propertyResult.error) throw propertyResult.error;
  if (historyResult.error) throw historyResult.error;

  return {
    property: propertyResult.data,
    history: historyResult.data ?? [],
  };
}

/**
 * Paginated user list for the admin table.
 */
export interface AdminUserFilters {
  search?: string;
  role?: "all" | "buyer" | "agency" | "admin";
  page?: number;
  pageSize?: number;
}

export async function getUsersAdmin(filters: AdminUserFilters = {}) {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("users")
    .select("id, email, full_name, phone, role, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false });

  if (filters.search && filters.search.trim() !== "") {
    const q = `%${filters.search.trim()}%`;
    query = query.or(`email.ilike.${q},full_name.ilike.${q}`);
  }
  if (filters.role && filters.role !== "all") {
    query = query.eq("role", filters.role);
  }

  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    rows: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
  };
}

/**
 * List of distinct partidos for the filter dropdown.
 */
export async function getDistinctPartidos() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select("partido")
    .not("partido", "is", null);

  if (error) throw error;
  const unique = Array.from(
    new Set((data ?? []).map((r) => r.partido).filter(Boolean)),
  ).sort();
  return unique as string[];
}
