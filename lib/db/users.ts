import { createClient } from "@/lib/supabase/server";

/**
 * Fetches the current authenticated user's profile.
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetches a user by ID (admin use).
 */
export async function getUserById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Counts total registered users (admin dashboard).
 */
export async function getUserCount() {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });

  if (error) throw error;
  return count ?? 0;
}
