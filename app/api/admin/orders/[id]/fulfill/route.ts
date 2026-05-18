import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  markOrderPaid,
  markOrderProcessing,
  getServiceOrderById,
} from "@/lib/db/service-orders";
import { fulfillServiceOrder } from "@/lib/services/fulfillment";

/**
 * Admin-only manual fulfillment trigger.
 *
 * Use cases:
 *   - Re-running fulfillment on a stuck order (the original webhook failed
 *     mid-flow, PDF wasn't generated, etc.).
 *   - Driving an end-to-end test when MercadoPago's checkout is blocked
 *     (e.g., test-user 2FA preventing real test payments).
 *
 * Behavior:
 *   - When the order is already `paid`/`processing`/`delivered`, just calls
 *     fulfillServiceOrder (idempotent).
 *   - When the order is `pending_payment`, also marks it paid with a fake
 *     payment_id ("manual-fulfill-<ts>") so the rest of the flow works.
 *
 * Auth: requires the caller to be an admin user (role='admin' in the
 * users table). Returns 404 otherwise to avoid leaking the endpoint.
 */
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  const { id: orderId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const order = await getServiceOrderById(orderId, { admin: true });
  if (!order) {
    return NextResponse.json({ error: "order not found" }, { status: 404 });
  }

  let markedJustPaid = false;
  if (order.status === "pending_payment") {
    const fakePaymentId = `manual-fulfill-${Date.now()}`;
    markedJustPaid = await markOrderPaid(orderId, fakePaymentId);
    if (markedJustPaid) {
      await markOrderProcessing(orderId);
    }
  }

  try {
    await fulfillServiceOrder(orderId);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "unknown",
        marked_paid: markedJustPaid,
      },
      { status: 500 },
    );
  }

  const finalOrder = await getServiceOrderById(orderId, { admin: true });
  return NextResponse.json({
    ok: true,
    orderId,
    marked_paid: markedJustPaid,
    status: finalOrder?.status ?? null,
    result_file_url: finalOrder?.result_file_url ?? null,
  });
}
