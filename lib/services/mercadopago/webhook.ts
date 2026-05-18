import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifies the HMAC signature MercadoPago sends with webhooks.
 *
 * MP sends two headers:
 *   x-signature:  "ts=<unix>,v1=<hmac-sha256-hex>"
 *   x-request-id: "<uuid>"
 *
 * The signed payload is:
 *   id:<data.id>;request-id:<x-request-id>;ts:<ts>;
 *
 * `data.id` is the resource id, available as query param `?data.id=...` on
 * the webhook URL or in the JSON body's `data.id`. We pass it in
 * explicitly so callers can pull it from either source.
 *
 * Returns false (not throws) on any malformed input so the route can
 * respond 401 instead of 500.
 */
export interface VerifyWebhookInput {
  signatureHeader: string | null;
  requestIdHeader: string | null;
  dataId: string;
  secret: string;
}

export function verifyWebhookSignature({
  signatureHeader,
  requestIdHeader,
  dataId,
  secret,
}: VerifyWebhookInput): boolean {
  if (!signatureHeader || !requestIdHeader || !dataId || !secret) return false;

  const parts = signatureHeader.split(",").map((p) => p.trim());
  const ts = parts.find((p) => p.startsWith("ts="))?.slice(3);
  const v1 = parts.find((p) => p.startsWith("v1="))?.slice(3);
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${requestIdHeader};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(v1, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
