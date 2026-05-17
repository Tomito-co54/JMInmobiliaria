import { createClient } from "@/lib/supabase/server";

export interface GroupWithListings {
  id: string;
  signature: string | null;
  matched_by: string;
  primary_listing_id: string | null;
  created_at: string;
  listings: Array<{
    id: string;
    source: string;
    external_id: string | null;
    address: string | null;
    partido: string | null;
    property_type: string | null;
    price_amount: number | null;
    price_currency: string | null;
  }>;
}

/**
 * Fetch all property groups with their attached listings.
 * Admin-only — uses the regular client (RLS allows admin reads via is_admin()).
 */
export async function getAllGroups(): Promise<GroupWithListings[]> {
  const supabase = await createClient();

  const { data: groups, error } = await supabase
    .from("property_groups")
    .select("id, signature, matched_by, primary_listing_id, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!groups || groups.length === 0) return [];

  const groupIds = groups.map((g) => g.id);
  const { data: listings, error: listErr } = await supabase
    .from("properties")
    .select(
      "id, source, external_id, address, partido, property_type, price_amount, price_currency, property_group_id",
    )
    .in("property_group_id", groupIds);

  if (listErr) throw listErr;

  const byGroup = new Map<string, GroupWithListings["listings"]>();
  for (const l of listings ?? []) {
    if (!l.property_group_id) continue;
    const arr = byGroup.get(l.property_group_id) ?? [];
    arr.push({
      id: l.id,
      source: l.source,
      external_id: l.external_id,
      address: l.address,
      partido: l.partido,
      property_type: l.property_type,
      price_amount: l.price_amount,
      price_currency: l.price_currency,
    });
    byGroup.set(l.property_group_id, arr);
  }

  return groups.map((g) => ({
    ...g,
    listings: byGroup.get(g.id) ?? [],
  }));
}
