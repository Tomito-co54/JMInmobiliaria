"use server";

import { createClient } from "@/lib/supabase/server";
import {
  getServiceDefinition,
  type ServiceTypeId,
} from "@/lib/services/catalog";
import {
  createServiceOrder,
  setOrderPreferenceId,
} from "@/lib/db/service-orders";
import { createPreference } from "@/lib/services/mercadopago";

export type CreateOrderResult =
  | { ok: true; orderId: string; redirectUrl: string }
  | { ok: false; error: string };

/**
 * Creates a service order and a MercadoPago preference, returns the
 * checkout URL. The page receives this URL and redirects the user to MP.
 *
 * We split the DB insert from the MP call so the order row is durable
 * even if MP momentarily fails — on retry we can call again and we'll
 * just upsert a new preference id.
 *
 * Security: the user must be signed in; the row is RLS-scoped to their
 * own user_id. Pricing comes from the server-side catalog, never from
 * the client (so they can't pay 0).
 */
export async function createServiceOrderAction(
  propertyId: string,
  serviceType: ServiceTypeId,
): Promise<CreateOrderResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Iniciá sesión para contratar un servicio." };
  }

  const service = getServiceDefinition(serviceType);
  if (!service.available) {
    return { ok: false, error: "Este servicio todavía no está disponible." };
  }

  // Validate the property exists (we don't want orphan orders pointing at
  // a missing property).
  const { data: property, error: pErr } = await supabase
    .from("properties")
    .select("id, address")
    .eq("id", propertyId)
    .maybeSingle();
  if (pErr) {
    return { ok: false, error: "No pudimos verificar la propiedad." };
  }
  if (!property) {
    return { ok: false, error: "La propiedad no existe." };
  }

  let order;
  try {
    order = await createServiceOrder({
      userId: user.id,
      propertyId,
      serviceType,
      price: service.price,
      currency: service.currency,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return { ok: false, error: `No pudimos crear la orden: ${msg}` };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    const preference = await createPreference({
      orderId: order.id,
      title: service.title,
      description: `${service.title} — ${(property as { address: string | null }).address ?? "Propiedad"}`,
      quantity: 1,
      unitPrice: service.price,
      currency: service.currency,
      payerEmail: user.email ?? "",
      returnUrls: {
        success: `${baseUrl}/pago/exito?order_id=${order.id}`,
        pending: `${baseUrl}/pago/pendiente?order_id=${order.id}`,
        failure: `${baseUrl}/pago/error?order_id=${order.id}`,
      },
      notificationUrl: `${baseUrl}/api/mercadopago/webhook`,
    });

    await setOrderPreferenceId(order.id, preference.id);

    // MP unified prefixes (both modes start with APP_USR-) so we can't
    // tell test vs prod from the token. init_point works in both modes;
    // sandbox_init_point exists for legacy compatibility but isn't
    // needed.
    return { ok: true, orderId: order.id, redirectUrl: preference.initPoint };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return {
      ok: false,
      error: `Orden creada pero falló el checkout: ${msg}. Intentá de nuevo.`,
    };
  }
}
