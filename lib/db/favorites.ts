import { createClient } from "@/lib/supabase/server";

/**
 * Fetches all favorites for the current user.
 */
export async function getUserFavorites(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("favorites")
    .select("*, properties(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Checks if a property is favorited by a user.
 */
export async function isFavorited(userId: string, propertyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("property_id", propertyId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

/**
 * Counts favorites created in the last N days (admin dashboard).
 */
export async function getFavoritesCount(days: number = 30) {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { count, error } = await supabase
    .from("favorites")
    .select("*", { count: "exact", head: true })
    .gte("created_at", since.toISOString());

  if (error) throw error;
  return count ?? 0;
}
