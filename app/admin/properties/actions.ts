"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  canPublishProperty,
  listingStatusSchema,
  ownerPropertyDraftSchema,
  ownerPropertyPublishSchema,
  type ListingStatus,
} from "@/lib/validators/property";
import {
  ensurePropertyCadastralByPartida,
  type EnsureCadastralResult,
} from "@/lib/services/arba/properties";
import {
  deleteAllPhotosForProperty,
  deletePropertyPhotoByUrl,
  uploadPropertyPhoto,
} from "@/lib/storage/property-photos";
import { validatePartida } from "@/lib/zona-sur/partidos";

/**
 * Server actions for the /admin property loader.
 *
 * All actions:
 *   - Require an admin session (early-return otherwise).
 *   - Operate only on properties whose source is owner-managed
 *     (owner_direct / agency). Scraped properties are off-limits from
 *     this surface — the scraping pipeline is the only writer for those.
 *   - Return { ok: true } | { ok: false, error } so the form can render
 *     field-level feedback.
 */

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const OWNER_SOURCES = ["owner_direct", "agency"] as const;
type OwnerSource = (typeof OWNER_SOURCES)[number];

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || (profile as { role: string }).role !== "admin") return null;
  return { supabase, userId: user.id };
}

// Note: creation of a new draft is NOT a Server Action — it happens
// inline in app/admin/properties/nueva/page.tsx so we don't hit the
// "revalidatePath during render" prohibition that Next.js 15 enforces.
// All other mutations below are invoked from client components (button
// transitions, form submissions), so revalidatePath is valid in them.

/**
 * Updates the editable fields of an owner property. Used for autosaving
 * each card section in the loader form.
 *
 * Important: this NEVER touches partida / nomenclatura_catastral /
 * surface_arba / tpa — those come exclusively from the ARBA lookup action.
 * Keeps the cadastral data trustworthy.
 */
export async function updateOwnerPropertyAction(
  propertyId: string,
  patch: Record<string, unknown>,
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: "No autorizado." };

  const parsed = ownerPropertyDraftSchema.safeParse(patch);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: first ? `${first.path.join(".")}: ${first.message}` : "Datos inválidos",
    };
  }

  const guard = await guardOwnerProperty(ctx.supabase, propertyId);
  if (!guard.ok) return guard;

  const { error } = await ctx.supabase
    .from("properties")
    .update(parsed.data as never)
    .eq("id", propertyId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/properties/${propertyId}/editar`);
  return { ok: true };
}

/**
 * Looks up cadastral data by partida and writes partida + nomenclatura +
 * surface_arba + tpa to the row. Idempotent — already-enriched properties
 * short-circuit.
 *
 * Validations:
 *   1. Local: partida is 9 digits and its prefix matches the partido.
 *      Catches paper-record typos before hitting ARBA.
 *   2. Persist `partido` on the row first (the bridge writes the rest).
 *   3. After ARBA returns, double-check the returned partida's prefix
 *      against the partido. If mismatch, surface a warning — still apply
 *      the data (ARBA is the source of truth) but tell the broker.
 */
export async function lookupArbaByPartidaAction(
  propertyId: string,
  partido: string,
  partida: string,
): Promise<
  ActionResult<{
    partida: string | null;
    nomenclatura: string;
    surfaceArba: number | null;
    tpa: string | null;
    /** Set when ARBA returned a partida whose prefix doesn't match `partido`. */
    warning: string | null;
  }>
> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: "No autorizado." };

  const validation = validatePartida(partido, partida);
  if (!validation.ok) {
    return { ok: false, error: validation.message };
  }

  const guard = await guardOwnerProperty(ctx.supabase, propertyId);
  if (!guard.ok) return guard;

  // Persist the chosen partido before the lookup — the row needs it on
  // disk regardless of ARBA's response.
  const { error: partidoErr } = await ctx.supabase
    .from("properties")
    .update({ partido } as never)
    .eq("id", propertyId);
  if (partidoErr) return { ok: false, error: partidoErr.message };

  let result: EnsureCadastralResult;
  try {
    result = await ensurePropertyCadastralByPartida(
      propertyId,
      validation.normalized,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return { ok: false, error: `ARBA falló: ${msg}` };
  }

  if (!result.ok) {
    if (result.reason === "partida_not_found") {
      return {
        ok: false,
        error: "ARBA no encontró ninguna parcela con esa partida.",
      };
    }
    return { ok: false, error: `ARBA: ${result.reason}` };
  }

  let warning: string | null = null;
  if (result.partida) {
    const returnedPrefix = result.partida.slice(0, 3);
    if (returnedPrefix !== validation.arbaCode) {
      warning =
        `ARBA devolvió una partida con prefijo ${returnedPrefix} ` +
        `(esperábamos ${validation.arbaCode} para ${partido}). ` +
        `Verificá los papeles.`;
    }
  }

  revalidatePath(`/admin/properties/${propertyId}/editar`);
  return {
    ok: true,
    data: {
      partida: result.partida,
      nomenclatura: result.nomenclatura,
      surfaceArba: result.surfaceArba,
      tpa: result.tipo,
      warning,
    },
  };
}

/**
 * Uploads a single photo via FormData, appends its public URL to
 * properties.photos[]. The first photo in the array is the portada.
 */
export async function uploadPropertyPhotoAction(
  propertyId: string,
  formData: FormData,
): Promise<ActionResult<{ photos: string[] }>> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: "No autorizado." };

  const guard = await guardOwnerProperty(ctx.supabase, propertyId);
  if (!guard.ok) return guard;

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "Archivo faltante." };
  }

  const upload = await uploadPropertyPhoto(propertyId, file);
  if (!upload.ok || !upload.url) {
    return { ok: false, error: upload.error ?? "No pudimos subir la foto." };
  }

  // Append to the photos array — read current, push, write.
  const { data: row, error: readErr } = await ctx.supabase
    .from("properties")
    .select("photos")
    .eq("id", propertyId)
    .single();
  if (readErr) return { ok: false, error: readErr.message };

  const current = Array.isArray((row as { photos: unknown }).photos)
    ? ((row as { photos: string[] }).photos)
    : [];
  const next = [...current, upload.url];

  const { error: writeErr } = await ctx.supabase
    .from("properties")
    .update({ photos: next } as never)
    .eq("id", propertyId);
  if (writeErr) return { ok: false, error: writeErr.message };

  revalidatePath(`/admin/properties/${propertyId}/editar`);
  return { ok: true, data: { photos: next } };
}

/**
 * Removes a photo by URL from both Storage and the row's photos array.
 */
export async function deletePropertyPhotoAction(
  propertyId: string,
  url: string,
): Promise<ActionResult<{ photos: string[] }>> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: "No autorizado." };

  const guard = await guardOwnerProperty(ctx.supabase, propertyId);
  if (!guard.ok) return guard;

  // Remove from Storage first; if the row update fails we'd be left with a
  // dangling URL but no orphan object.
  const del = await deletePropertyPhotoByUrl(url);
  if (!del.ok) return { ok: false, error: del.error ?? "No pudimos borrar la foto." };

  const { data: row, error: readErr } = await ctx.supabase
    .from("properties")
    .select("photos")
    .eq("id", propertyId)
    .single();
  if (readErr) return { ok: false, error: readErr.message };

  const current = Array.isArray((row as { photos: unknown }).photos)
    ? ((row as { photos: string[] }).photos)
    : [];
  const next = current.filter((u) => u !== url);

  const { error: writeErr } = await ctx.supabase
    .from("properties")
    .update({ photos: next } as never)
    .eq("id", propertyId);
  if (writeErr) return { ok: false, error: writeErr.message };

  revalidatePath(`/admin/properties/${propertyId}/editar`);
  return { ok: true, data: { photos: next } };
}

/**
 * Persists the photos array in a new order. The first URL is the portada.
 *
 * The action is defensive — it intersects the submitted order with what's
 * currently on disk, so a race condition (client reorders while a delete
 * lands) can't reintroduce a deleted URL.
 */
export async function reorderPropertyPhotosAction(
  propertyId: string,
  orderedUrls: string[],
): Promise<ActionResult<{ photos: string[] }>> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: "No autorizado." };

  const guard = await guardOwnerProperty(ctx.supabase, propertyId);
  if (!guard.ok) return guard;

  const { data: row, error: readErr } = await ctx.supabase
    .from("properties")
    .select("photos")
    .eq("id", propertyId)
    .single();
  if (readErr) return { ok: false, error: readErr.message };

  const current = new Set(
    Array.isArray((row as { photos: unknown }).photos)
      ? ((row as { photos: string[] }).photos)
      : [],
  );
  const next = orderedUrls.filter((u) => current.has(u));

  // If the client missed any photo, append the leftovers at the end so
  // we never silently lose data.
  for (const u of current) {
    if (!next.includes(u)) next.push(u);
  }

  const { error: writeErr } = await ctx.supabase
    .from("properties")
    .update({ photos: next } as never)
    .eq("id", propertyId);
  if (writeErr) return { ok: false, error: writeErr.message };

  revalidatePath(`/admin/properties/${propertyId}/editar`);
  return { ok: true, data: { photos: next } };
}

/**
 * Transitions a property between the three listing states. When moving to
 * 'publicada' we run the publish-readiness check; the other transitions
 * are unconditional.
 */
export async function changeListingStatusAction(
  propertyId: string,
  newStatus: ListingStatus,
): Promise<ActionResult<{ missing?: string[] }>> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: "No autorizado." };

  const parsed = listingStatusSchema.safeParse(newStatus);
  if (!parsed.success) {
    return { ok: false, error: "Estado inválido." };
  }

  const guard = await guardOwnerProperty(ctx.supabase, propertyId);
  if (!guard.ok) return guard;

  if (parsed.data === "publicada") {
    const { data: row } = await ctx.supabase
      .from("properties")
      .select(
        "property_type, operation_type, price_amount, price_currency, partido, partida, nomenclatura_catastral, address, photos",
      )
      .eq("id", propertyId)
      .single();
    if (!row) return { ok: false, error: "Propiedad no encontrada." };

    const check = canPublishProperty(row as never);
    if (!check.ok) {
      return {
        ok: false,
        error: `Faltan datos para publicar: ${check.missing.join(", ")}.`,
        // surface the structured missing list too in case the UI wants it
      };
    }
  }

  const { error } = await ctx.supabase
    .from("properties")
    .update({ listing_status: parsed.data } as never)
    .eq("id", propertyId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/properties/${propertyId}/editar`);
  revalidatePath("/admin/properties");
  revalidatePath("/"); // home stats / catalog
  return { ok: true };
}

/**
 * Permanently deletes an owner property — row + all photos in Storage.
 * Refuses to operate on scraped properties (guardOwnerProperty enforces).
 */
export async function deleteOwnerPropertyAction(
  propertyId: string,
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: "No autorizado." };

  const guard = await guardOwnerProperty(ctx.supabase, propertyId);
  if (!guard.ok) return guard;

  // Best-effort photo cleanup. If it fails we still proceed with the row
  // delete — leftover objects can be GC'd later from the dashboard.
  await deleteAllPhotosForProperty(propertyId);

  const { error } = await ctx.supabase
    .from("properties")
    .delete()
    .eq("id", propertyId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/properties");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Verifies that the property exists AND its source is owner-managed.
 * Scraped properties are off-limits from these actions — the scraping
 * pipeline owns them.
 */
async function guardOwnerProperty(
  supabase: Awaited<ReturnType<typeof createClient>>,
  propertyId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("properties")
    .select("source")
    .eq("id", propertyId)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Propiedad no encontrada." };
  const source = (data as { source: string }).source as OwnerSource;
  if (!OWNER_SOURCES.includes(source)) {
    return {
      ok: false,
      error:
        "Esta propiedad fue scrapeada — no se edita desde el cargador. " +
        "Las scrapeadas solo se ven (read-only) en el panel.",
    };
  }
  return { ok: true };
}
