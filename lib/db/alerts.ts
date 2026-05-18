import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

/**
 * Helpers for the `alerts` table — in-app notification feed.
 *
 * Reads use the user-bound server client (RLS enforces "own alerts only").
 * Writes use a service-role client because the detection job runs as a
 * background script and needs to insert alerts on behalf of each user.
 */

export type AlertType = "new_match" | "price_drop" | "score_change";

export interface AlertRow {
  id: string;
  user_id: string;
  type: AlertType;
  property_id: string | null;
  message: string | null;
  sent_at: string;
  read_at: string | null;
}

export interface AlertRowWithProperty extends AlertRow {
  property?: {
    id: string;
    address: string | null;
    partido: string | null;
    price_amount: number | null;
    price_currency: "USD" | "ARS" | null;
    photos: string[];
  } | null;
}

const COLS = "id, user_id, type, property_id, message, sent_at, read_at";
const COLS_WITH_PROPERTY =
  "id, user_id, type, property_id, message, sent_at, read_at, property:properties(id, address, partido, price_amount, price_currency, photos)";

/**
 * The user's most recent alerts, joined with the related property.
 */
export async function getUserAlerts(limit = 50): Promise<AlertRowWithProperty[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("alerts")
    .select(COLS_WITH_PROPERTY)
    .order("sent_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as AlertRowWithProperty[];
}

export async function getUnreadAlertsCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("alerts")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

export async function markAlertRead(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("alerts")
    .update({ read_at: new Date().toISOString() } as never)
    .eq("id", id);
  if (error) throw error;
}

export async function markAllAlertsRead(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("alerts")
    .update({ read_at: new Date().toISOString() } as never)
    .is("read_at", null);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Detection-side writes (service role)
// ---------------------------------------------------------------------------

let cachedAdminClient: ReturnType<typeof createAdminClient> | null = null;

function getAdminClient() {
  if (cachedAdminClient) return cachedAdminClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY for alert detection");
  }
  cachedAdminClient = createAdminClient(url, key, { auth: { persistSession: false } });
  return cachedAdminClient;
}

export interface InsertAlertInput {
  user_id: string;
  type: AlertType;
  property_id: string;
  message: string;
}

export async function insertAlerts(alerts: InsertAlertInput[]): Promise<number> {
  if (alerts.length === 0) return 0;
  const supabase = getAdminClient();
  const { error } = await supabase.from("alerts").insert(alerts as never);
  if (error) throw error;
  return alerts.length;
}

/**
 * Has this (user, property, type) alert been emitted recently?
 *
 * Prevents the daily detector from spamming the same alert on every run.
 * We dedupe within a rolling 14-day window: for new_match we don't want
 * to re-announce the same property after the user marks it read; for
 * price_drop we re-announce if the price drops *again* (different price
 * pair embedded in the message).
 */
export async function hasRecentAlert(
  userId: string,
  propertyId: string,
  type: AlertType,
  windowDays = 14,
  messageContains?: string,
): Promise<boolean> {
  const supabase = getAdminClient();
  const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  let query = supabase
    .from("alerts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("property_id", propertyId)
    .eq("type", type)
    .gte("sent_at", cutoff);
  if (messageContains) {
    query = query.like("message", `%${messageContains}%`);
  }
  const { count, error } = await query;
  if (error) throw error;
  return (count ?? 0) > 0;
}

export { COLS };
