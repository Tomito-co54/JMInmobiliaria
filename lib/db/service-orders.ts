import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { ServiceTypeId } from "@/lib/services/catalog";

/**
 * Service order types — kept narrow so callers and the DB share a vocabulary.
 * Mirrors the order_status enum in supabase/migrations/00001.
 */
export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "delivered"
  | "refunded";

export interface ServiceOrder {
  id: string;
  user_id: string;
  property_id: string | null;
  service_type: ServiceTypeId;
  status: OrderStatus;
  price: number;
  currency: "ARS" | "USD";
  mercadopago_payment_id: string | null;
  mp_preference_id: string | null;
  result_file_url: string | null;
  paid_at: string | null;
  delivered_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Fetches service orders for a user (read via RLS as that user).
 */
export async function getUserServiceOrders(userId: string): Promise<ServiceOrder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_orders")
    .select("*, properties(address, partido)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as ServiceOrder[];
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

/**
 * Creates a service order in `pending_payment` status. Returns the new
 * row so the caller can pass its id to MP when creating the preference.
 *
 * Uses the user's RLS-scoped client (not admin) — the row's user_id
 * must equal auth.uid() per policy.
 */
export interface CreateServiceOrderInput {
  userId: string;
  propertyId: string;
  serviceType: ServiceTypeId;
  price: number;
  currency: "ARS" | "USD";
}

export async function createServiceOrder(
  input: CreateServiceOrderInput,
): Promise<ServiceOrder> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_orders")
    .insert({
      user_id: input.userId,
      property_id: input.propertyId,
      service_type: input.serviceType,
      price: input.price,
      currency: input.currency,
      status: "pending_payment",
    } as never)
    .select("*")
    .single();

  if (error) throw error;
  return data as unknown as ServiceOrder;
}

/**
 * Attaches the MP preference id to an order after we get it from MP.
 * Separate from createServiceOrder so the order row is durable even if
 * the MP API call fails — we can retry preference creation without
 * inserting a second order row.
 */
export async function setOrderPreferenceId(
  orderId: string,
  preferenceId: string,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("service_orders")
    .update({ mp_preference_id: preferenceId } as never)
    .eq("id", orderId);
  if (error) throw error;
}

/**
 * Looks up an order by id. Webhook + return URL handlers use admin
 * client so they bypass RLS — these handlers run without a user session.
 */
export async function getServiceOrderById(
  orderId: string,
  options: { admin?: boolean } = {},
): Promise<ServiceOrder | null> {
  const supabase = options.admin ? createAdminClient() : await createClient();
  const { data, error } = await supabase
    .from("service_orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as ServiceOrder) ?? null;
}

/**
 * Webhook lookup — find the order MP is notifying about. We try
 * preference_id first (set when we created the order) and fall back to
 * payment_id (set after first webhook).
 */
export async function getServiceOrderByPreferenceId(
  preferenceId: string,
): Promise<ServiceOrder | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("service_orders")
    .select("*")
    .eq("mp_preference_id", preferenceId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as ServiceOrder) ?? null;
}

export async function getServiceOrderByPaymentId(
  paymentId: string,
): Promise<ServiceOrder | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("service_orders")
    .select("*")
    .eq("mercadopago_payment_id", paymentId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as ServiceOrder) ?? null;
}

/**
 * Marks an order as paid. Idempotent on payment_id — re-running with the
 * same payment_id is a no-op (so duplicate webhooks don't double-stamp).
 *
 * Returns true if the row was actually updated, false if already paid.
 * Callers use the boolean to decide whether to kick off PDF generation
 * (don't generate twice).
 */
export async function markOrderPaid(
  orderId: string,
  paymentId: string,
): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("service_orders")
    .update({
      status: "paid",
      mercadopago_payment_id: paymentId,
      paid_at: new Date().toISOString(),
    } as never)
    .eq("id", orderId)
    .neq("status", "paid")
    .neq("status", "delivered")
    .select("id");
  if (error) throw error;
  return (data ?? []).length > 0;
}

/**
 * Marks an order as processing (PDF generation in flight). Lets the UI
 * distinguish "paid, waiting" from "paid, generating".
 */
export async function markOrderProcessing(orderId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("service_orders")
    .update({ status: "processing" } as never)
    .eq("id", orderId)
    .eq("status", "paid");
  if (error) throw error;
}

/**
 * Marks an order as delivered with the PDF URL. Called after the PDF is
 * uploaded to Supabase Storage and the email is queued.
 */
export async function markOrderDelivered(
  orderId: string,
  fileUrl: string,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("service_orders")
    .update({
      status: "delivered",
      result_file_url: fileUrl,
      delivered_at: new Date().toISOString(),
    } as never)
    .eq("id", orderId);
  if (error) throw error;
}
