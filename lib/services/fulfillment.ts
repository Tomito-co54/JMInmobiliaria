import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import {
  getServiceOrderById,
  markOrderDelivered,
} from "@/lib/db/service-orders";
import { getServiceDefinition } from "@/lib/services/catalog";
import { generateArbaReport } from "@/lib/services/pdf";
import { uploadDeliverable } from "@/lib/services/storage/deliverables";
import { sendServiceDeliveryEmail } from "@/lib/services/email";

/**
 * Orchestrates the post-payment side of a service order: generate the
 * deliverable, upload it, send the email, and mark the order delivered.
 *
 * Called from the MP webhook (after the order is `paid`/`processing`).
 * Runs detached from the webhook response — MP's 22s timeout is too
 * tight for PDF + upload + email.
 *
 * Idempotent on `delivered` state — re-running on a delivered order is
 * a no-op. The order_id is part of every storage path, so re-running on
 * paid status (e.g., manual retry) creates a fresh file rather than
 * conflicting with the old one.
 */
export async function fulfillServiceOrder(orderId: string): Promise<void> {
  const order = await getServiceOrderById(orderId, { admin: true });
  if (!order) {
    throw new Error(`fulfillment: order ${orderId} not found`);
  }
  if (order.status === "delivered") {
    return;
  }

  switch (order.service_type) {
    case "cadastral_report":
      await fulfillCadastralReport(orderId);
      return;
    default:
      throw new Error(
        `fulfillment: no handler for service_type=${order.service_type}`,
      );
  }
}

async function fulfillCadastralReport(orderId: string): Promise<void> {
  const supabase = createAdminClient();

  // Load the order with the property + the cached ARBA lookup. We use
  // admin client because fulfillment runs without a user session.
  const { data: orderRow, error: orderErr } = await supabase
    .from("service_orders")
    .select(
      "id, user_id, property_id, service_type, status, properties (id, address, partido, surface_total, surface_covered, property_type, lat, lng), users (email, full_name)",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (orderErr) throw new Error(`fulfillment: load order failed: ${orderErr.message}`);
  if (!orderRow) throw new Error(`fulfillment: order ${orderId} disappeared`);

  // Supabase JS types nested foreign-key joins as arrays, but PostgREST
  // returns objects for single FKs. Bridge with unknown.
  const property = (orderRow as unknown as { properties: Record<string, unknown> | null })
    .properties;
  if (!property) {
    throw new Error(`fulfillment: order ${orderId} has no property`);
  }
  const user = (orderRow as unknown as { users: Record<string, unknown> | null }).users;

  // Resolve the ARBA lookup. We try by property_id (if a join table
  // exists) or by lat/lng proximity using the helper that backfilled
  // the data in B2.3.
  const { data: arba, error: arbaErr } = await supabase
    .from("arba_lookups")
    .select("partida, nomenclatura, surface_arba, tipo, raw_response")
    .eq("lat", (property as { lat: number }).lat)
    .eq("lng", (property as { lng: number }).lng)
    .maybeSingle();
  if (arbaErr) {
    // Non-fatal — we still generate a PDF with the property data and
    // skip the ARBA section. The user gets *something* for their money.
  }

  const geometry = (arba?.raw_response as { features?: Array<{ geometry?: unknown }> } | null)
    ?.features?.[0]?.geometry ?? null;

  const pdfBuffer = await generateArbaReport({
    orderId,
    generatedAt: new Date().toISOString(),
    property: {
      address: (property as { address: string | null }).address,
      partido: (property as { partido: string | null }).partido,
      surface_total: (property as { surface_total: number | null }).surface_total,
      surface_covered: (property as { surface_covered: number | null }).surface_covered,
      property_type: (property as { property_type: string | null }).property_type,
    },
    arba: {
      partida: arba?.partida ?? null,
      nomenclatura: arba?.nomenclatura ?? null,
      surface_arba: arba?.surface_arba ? Number(arba.surface_arba) : null,
      tipo: arba?.tipo ?? null,
      geometry,
    },
  });

  const { signedUrl } = await uploadDeliverable({
    orderId,
    serviceType: "cadastral_report",
    pdfBuffer,
  });

  await markOrderDelivered(orderId, signedUrl);

  const service = getServiceDefinition("cadastral_report");
  const userEmail = (user as { email: string | null } | null)?.email;
  if (userEmail) {
    const result = await sendServiceDeliveryEmail({
      to: userEmail,
      recipientName:
        ((user as { full_name: string | null } | null)?.full_name) ?? null,
      serviceTitle: service.title,
      propertyAddress: (property as { address: string | null }).address,
      folio: orderId.split("-")[0].toUpperCase(),
      downloadUrl: signedUrl,
    });
    if (!result.ok && !("skipped" in result)) {
      console.error(`[fulfillment] order=${orderId} email failed:`, result.error);
    }
  }
}
