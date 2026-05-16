import { createClient } from "@/lib/supabase/server";

/**
 * Fetches a single property by ID.
 */
export async function getPropertyById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetches active properties with optional filters.
 */
export async function getProperties(options?: {
  partido?: string;
  propertyType?: string;
  operationType?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("properties")
    .select("*", { count: "exact" })
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (options?.partido) {
    query = query.eq("partido", options.partido);
  }
  if (options?.propertyType) {
    query = query.eq("property_type", options.propertyType);
  }
  if (options?.operationType) {
    query = query.eq("operation_type", options.operationType);
  }

  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

/**
 * Counts properties by status (for admin dashboard).
 */
export async function getPropertyCounts() {
  const supabase = await createClient();

  const [activeResult, totalResult] = await Promise.all([
    supabase
      .from("properties")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("properties")
      .select("*", { count: "exact", head: true }),
  ]);

  return {
    active: activeResult.count ?? 0,
    total: totalResult.count ?? 0,
    inactive: (totalResult.count ?? 0) - (activeResult.count ?? 0),
  };
}
