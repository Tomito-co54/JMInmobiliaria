import { createClient } from "@/lib/supabase/server";
import { PUBLIC_PROPERTY_SOURCES } from "@/lib/db/property-sources";

/**
 * Fetches all favorites for the current user, restricted to favorites
 * whose underlying property is publicly listed (owner_direct or agency).
 *
 * Why filter here too: a user could theoretically have favorited a
 * scraped property when the catalog was still mixed; we don't want
 * stale favorites pointing at market-intel listings to leak through
 * the buyer-facing /favoritos page. The `!inner` modifier turns the
 * embedded join into an inner join so the source filter actually
 * removes the parent row, not just nulls the embed.
 */
export async function getUserFavorites(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("favorites")
    .select("*, properties!inner(*)")
    .eq("user_id", userId)
    .in(
      "properties.source",
      PUBLIC_PROPERTY_SOURCES as unknown as string[],
    )
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
 * Returns the set of property IDs the current user has favorited. Used by
 * list pages to render the heart icon's initial state in one query instead
 * of N round-trips.
 */
export async function getFavoritedPropertyIds(userId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("favorites")
    .select("property_id")
    .eq("user_id", userId);
  if (error) throw error;
  const ids = new Set<string>();
  for (const row of (data ?? []) as Array<{ property_id: string }>) {
    ids.add(row.property_id);
  }
  return ids;
}

/**
 * Adds a property to a user's favorites. No-op when already favorited
 * (idempotent — useful for retry paths).
 */
export async function addFavorite(userId: string, propertyId: string): Promise<void> {
  const supabase = await createClient();
  // The (user_id, property_id) unique constraint handles the dedup; we ignore
  // 23505 (unique_violation) so a double-tap doesn't blow up.
  const { error } = await supabase
    .from("favorites")
    .insert({ user_id: userId, property_id: propertyId } as never);
  if (error && error.code !== "23505") throw error;
}

export async function removeFavorite(userId: string, propertyId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("property_id", propertyId);
  if (error) throw error;
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
