import { randomUUID } from "node:crypto";
import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * Server-side helpers for the `property-photos` bucket.
 *
 * All operations use the service-role client so RLS doesn't block uploads
 * coming from server actions. The caller (the admin action layer) is
 * responsible for verifying the user is admin before invoking these.
 */

const BUCKET = "property-photos";

/** Mime types accepted by the bucket — must match migration 00012. */
export const ACCEPTED_PHOTO_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing",
    );
  }
  return createServiceClient(url, key, { auth: { persistSession: false } });
}

export interface UploadResult {
  ok: boolean;
  url?: string;
  error?: string;
}

/**
 * Uploads a single photo for a property. Returns the public URL on success.
 * Files land at `<propertyId>/<uuid>.<ext>` so multiple uploads never
 * collide and bulk-deleting all photos of a property is a single prefix op.
 */
export async function uploadPropertyPhoto(
  propertyId: string,
  file: File,
): Promise<UploadResult> {
  if (
    !ACCEPTED_PHOTO_MIMES.includes(
      file.type as (typeof ACCEPTED_PHOTO_MIMES)[number],
    )
  ) {
    return { ok: false, error: `Tipo no soportado: ${file.type}` };
  }

  const ext = MIME_TO_EXT[file.type] ?? "bin";
  const path = `${propertyId}/${randomUUID()}.${ext}`;

  const supabase = getServiceClient();
  const buffer = await file.arrayBuffer();

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });
  if (error) return { ok: false, error: error.message };

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { ok: true, url: pub.publicUrl };
}

/**
 * Deletes a single photo by its public URL. Extracts the object path from
 * the URL — the bucket layout makes this unambiguous.
 *
 * Idempotent — deleting an object that doesn't exist is a no-op.
 */
export async function deletePropertyPhotoByUrl(
  url: string,
): Promise<{ ok: boolean; error?: string }> {
  const path = extractObjectPath(url);
  if (!path) {
    return { ok: false, error: "URL inválida" };
  }
  const supabase = getServiceClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Bulk delete every photo for a property — used when the property itself
 * is being deleted.
 */
export async function deleteAllPhotosForProperty(
  propertyId: string,
): Promise<{ ok: boolean; deleted: number; error?: string }> {
  const supabase = getServiceClient();
  const { data, error: listErr } = await supabase.storage
    .from(BUCKET)
    .list(propertyId);
  if (listErr) return { ok: false, deleted: 0, error: listErr.message };
  if (!data || data.length === 0) return { ok: true, deleted: 0 };

  const paths = data.map((obj) => `${propertyId}/${obj.name}`);
  const { error: delErr } = await supabase.storage.from(BUCKET).remove(paths);
  if (delErr) return { ok: false, deleted: 0, error: delErr.message };
  return { ok: true, deleted: paths.length };
}

/**
 * Extracts the storage object path from a public URL.
 * Public URLs look like:
 *   https://<ref>.supabase.co/storage/v1/object/public/property-photos/<id>/<uuid>.<ext>
 */
function extractObjectPath(url: string): string | null {
  const marker = `/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}
