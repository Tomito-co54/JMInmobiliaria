import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

const BUCKET = "service-deliverables";

/**
 * Uploads a deliverable PDF and returns a long-lived signed URL.
 *
 * Path convention: `<orderId>/<serviceType>-<timestamp>.pdf`. The path
 * encodes the orderId as the first segment so the RLS policy can join
 * to service_orders to check ownership.
 *
 * Idempotency: each upload includes a timestamp, so re-running creates
 * a new file rather than overwriting. The caller (fulfillment) is
 * expected to be idempotent itself — the order's status guards against
 * double-fulfillment.
 */
export interface UploadDeliverableInput {
  orderId: string;
  serviceType: string;
  pdfBuffer: Buffer;
}

export async function uploadDeliverable({
  orderId,
  serviceType,
  pdfBuffer,
}: UploadDeliverableInput): Promise<{ path: string; signedUrl: string }> {
  const supabase = createAdminClient();
  const ts = Date.now();
  const path = `${orderId}/${serviceType}-${ts}.pdf`;

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, pdfBuffer, {
      contentType: "application/pdf",
      upsert: false,
    });
  if (uploadErr) {
    throw new Error(`storage upload failed: ${uploadErr.message}`);
  }

  // 30 days. Long enough for the user to download at their leisure;
  // they can re-request a fresh URL via /mis-servicios.
  const { data: signed, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 30);
  if (signErr || !signed?.signedUrl) {
    throw new Error(`signed URL failed: ${signErr?.message ?? "no url"}`);
  }

  return { path, signedUrl: signed.signedUrl };
}

/**
 * Refreshes the signed URL for a previously uploaded deliverable. Used
 * by /mis-servicios when the stored URL has expired.
 */
export async function refreshDeliverableSignedUrl(path: string): Promise<string> {
  const supabase = createAdminClient();
  const { data: signed, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 30);
  if (error || !signed?.signedUrl) {
    throw new Error(`signed URL refresh failed: ${error?.message ?? "no url"}`);
  }
  return signed.signedUrl;
}
