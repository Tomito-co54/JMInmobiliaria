import { createClient } from "@/lib/supabase/server";

/**
 * Fetches service orders for a user.
 */
export async function getUserServiceOrders(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_orders")
    .select("*, properties(address, partido)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Counts service orders in the last N days (admin dashboard).
 */
export async function getServiceOrdersCount(days: number = 30) {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { count, error } = await supabase
    .from("service_orders")
    .select("*", { count: "exact", head: true })
    .gte("created_at", since.toISOString());

  if (error) throw error;
  return count ?? 0;
}
