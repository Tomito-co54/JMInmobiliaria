"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createSearchProfile,
  deleteSearchProfile,
  setPrimarySearchProfile,
  updateSearchProfile,
  SearchProfileLimitError,
} from "@/lib/db/search-profiles";
import { getCurrentUserId } from "@/lib/db/users";
import { KNOWN_MUST_HAVES } from "@/lib/matching";
import { PARTIDOS_ZONA_SUR } from "@/lib/zona-sur/partidos";
import type {
  SearchProfileActionResult,
  SearchProfileFormValues,
} from "@/components/search-profile/SearchProfileForm";

const ZoneSchema = z.object({
  partido: z.enum(PARTIDOS_ZONA_SUR),
  priority: z.enum(["preferido", "aceptable", "descarte"]),
});

const InputSchema = z.object({
  name: z.string().min(1).max(60),
  zones: z.array(ZoneSchema),
  operation_type: z.enum(["venta", "alquiler"]).nullable(),
  property_types: z.array(z.enum(["casa", "departamento", "ph", "lote", "local"])).min(1),
  price_currency: z.enum(["USD", "ARS"]),
  price_min: z.number().int().min(0).nullable(),
  price_max: z.number().int().min(0).nullable(),
  rooms_min: z.number().int().min(0).max(20).nullable(),
  surface_min: z.number().int().min(0).max(10000).nullable(),
  must_haves: z.array(z.enum(KNOWN_MUST_HAVES)),
});

type ValidationResult =
  | { ok: true; data: z.infer<typeof InputSchema> }
  | { ok: false; error: string };

/**
 * Format an unknown thrown value into a human-readable string.
 *
 * Supabase JS errors are plain objects with shape:
 *   { message, details, hint, code }
 * They are NOT instances of Error. A naive `err instanceof Error`
 * check misses them and we end up surfacing "Error desconocido"
 * to the user when the real cause was an RLS violation, a check
 * constraint, a missing column, etc.
 */
function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const obj = err as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };
    const parts = [obj.message, obj.details, obj.hint, obj.code]
      .filter((v) => typeof v === "string" && v.length > 0)
      .map(String);
    if (parts.length) return parts.join(" — ");
  }
  return "Error desconocido";
}

function validate(raw: SearchProfileFormValues): ValidationResult {
  const parsed = InputSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: first ? `${first.path.join(".")}: ${first.message}` : "Datos inválidos",
    };
  }
  const { price_min, price_max } = parsed.data;
  if (price_min !== null && price_max !== null && price_min > price_max) {
    return { ok: false, error: "El precio mínimo no puede ser mayor al máximo" };
  }
  return { ok: true, data: parsed.data };
}

export async function createBusquedaAction(
  raw: SearchProfileFormValues,
): Promise<SearchProfileActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Sesión expirada" };

  const validation = validate(raw);
  if (!validation.ok) return validation;

  try {
    await createSearchProfile(userId, validation.data);
  } catch (err) {
    if (err instanceof SearchProfileLimitError) {
      return { ok: false, error: err.message };
    }
    const msg = errMsg(err);
    return { ok: false, error: `No se pudo crear: ${msg}` };
  }

  revalidatePath("/busquedas");
  revalidatePath("/dashboard");
  redirect("/busquedas");
}

export async function updateBusquedaAction(
  id: string,
  raw: SearchProfileFormValues,
): Promise<SearchProfileActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Sesión expirada" };

  const validation = validate(raw);
  if (!validation.ok) return validation;

  try {
    await updateSearchProfile(id, userId, validation.data);
  } catch (err) {
    const msg = errMsg(err);
    return { ok: false, error: `No se pudo actualizar: ${msg}` };
  }

  revalidatePath("/busquedas");
  revalidatePath("/dashboard");
  redirect("/busquedas");
}

export async function deleteBusquedaAction(id: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;
  await deleteSearchProfile(id);
  revalidatePath("/busquedas");
  revalidatePath("/dashboard");
}

export async function setPrimaryBusquedaAction(id: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;
  await setPrimarySearchProfile(id, userId);
  revalidatePath("/busquedas");
  revalidatePath("/dashboard");
}
