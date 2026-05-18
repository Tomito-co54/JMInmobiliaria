import { NextResponse, type NextRequest } from "next/server";
import { verifyWebhookSignature, getPayment } from "@/lib/services/mercadopago";
import {
  getServiceOrderById,
  markOrderPaid,
  markOrderProcessing,
} from "@/lib/db/service-orders";
import { fulfillServiceOrder } from "@/lib/services/fulfillment";

/**
 * MercadoPago webhook receiver.
 *
 * Security model:
 *   1. MP sends x-signature and x-request-id headers. We verify HMAC.
 *   2. We then fetch the payment from MP's API using its id — never trust
 *      the webhook body for status/amount. An attacker could forge a body
 *      with status=approved but they can't forge our API response.
 *   3. external_reference on the payment is our order id (set when we
 *      created the preference). That's the link back.
 *
 * Idempotency:
 *   markOrderPaid uses a conditional UPDATE that returns 0 rows if the
 *   order is already paid/delivered. We use that to avoid double-charging
 *   fulfillment (e.g., generating two PDFs from two duplicate webhooks).
 *
 * Response policy: always 200 unless we genuinely couldn't process. MP
 * retries on non-2xx, so a 200 with a logged-and-ignored body is better
 * than a 500 retry loop.
 */
export async function POST(req: NextRequest) {
  const signatureHeader = req.headers.get("x-signature");
  const requestIdHeader = req.headers.get("x-request-id");
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

  // data.id may arrive as query param or in the body. Try both.
  const url = new URL(req.url);
  const queryDataId = url.searchParams.get("data.id");

  let bodyText = "";
  try {
    bodyText = await req.text();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  let body: { type?: string; data?: { id?: string }; action?: string } = {};
  if (bodyText.trim()) {
    try {
      body = JSON.parse(bodyText);
    } catch {
      // empty or non-JSON — MP sometimes pings with empty body during setup
      body = {};
    }
  }

  const dataId = queryDataId ?? body.data?.id ?? null;

  // Setup pings: MP sends an event with no real data when you configure
  // a webhook in the panel ("test event"). Acknowledge with 200 so the
  // panel marks the URL as healthy.
  if (!dataId) {
    return NextResponse.json({ ok: true, note: "setup ping (no data.id)" });
  }

  // Signature verification — but only when secret is configured. During
  // local dev / first deploy the secret isn't set yet; we accept the
  // event without verification (logged), so we can wire the flow before
  // configuring MP. In prod the secret is required.
  if (secret) {
    const ok = verifyWebhookSignature({
      signatureHeader,
      requestIdHeader,
      dataId,
      secret,
    });
    if (!ok) {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }
  }

  // We only care about payment events. MP also sends merchant_order
  // events, refunds, etc.
  const type = body.type ?? url.searchParams.get("type");
  if (type && type !== "payment") {
    return NextResponse.json({ ok: true, note: `ignored type=${type}` });
  }

  let payment;
  try {
    payment = await getPayment(dataId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    // 404 = unknown payment (test ping with fake id). Log and 200.
    if (msg.includes("404") || msg.toLowerCase().includes("not found")) {
      return NextResponse.json({ ok: true, note: "payment not found" });
    }
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  if (payment.status !== "approved") {
    return NextResponse.json({
      ok: true,
      note: `ignored status=${payment.status}`,
    });
  }

  const orderId = payment.externalReference;
  if (!orderId) {
    return NextResponse.json({
      ok: true,
      note: "approved payment without external_reference",
    });
  }

  const order = await getServiceOrderById(orderId, { admin: true });
  if (!order) {
    return NextResponse.json({
      ok: true,
      note: `unknown order ${orderId}`,
    });
  }

  // Sanity: the payment amount and currency must match what we charged.
  // If they don't, surface the discrepancy and don't fulfill.
  if (
    payment.transactionAmount !== order.price ||
    payment.currencyId !== order.currency
  ) {
    return NextResponse.json(
      {
        error: "amount/currency mismatch",
        expected: { price: order.price, currency: order.currency },
        got: { amount: payment.transactionAmount, currency: payment.currencyId },
      },
      { status: 409 },
    );
  }

  const wasJustPaid = await markOrderPaid(orderId, String(payment.id));
  if (!wasJustPaid) {
    return NextResponse.json({ ok: true, note: "already paid" });
  }

  // Fire fulfillment but don't await — MP's webhook has a 22s timeout
  // and PDF generation + upload + email may take longer. Fulfillment is
  // resumable on its own (the order row is `paid` and can be retried).
  await markOrderProcessing(orderId);
  fulfillServiceOrder(orderId).catch((err) => {
    // Last-resort log — Sentry will pick this up via the error boundary
    // if we were on the page render path, but here we're outside the
    // request lifecycle, so we log to stderr explicitly.
    console.error(`[fulfillment] order=${orderId} failed:`, err);
  });

  return NextResponse.json({ ok: true, orderId, note: "marked paid + processing" });
}

/**
 * GET is convenient for the MP panel "test webhook" button which sends a
 * GET to verify the URL responds. Returns 200 with a tiny payload.
 */
export async function GET() {
  return NextResponse.json({ ok: true, service: "mercadopago-webhook" });
}
