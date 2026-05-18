"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSearchProfile, SearchProfileLimitError } from "@/lib/db/search-profiles";
import { getCurrentUserId } from "@/lib/db/users";
import { KNOWN_MUST_HAVES } from "@/lib/matching";
import { PARTIDOS_ZONA_SUR } from "@/lib/zona-sur/partidos";
import type {
  SearchProfileActionResult,
  SearchProfileFormValues,
} from "@/components/search-profile/SearchProfileForm";

/**
 * Server action for the onboarding flow.
 *
 * Same shape as the busquedas actions (so the shared SearchProfileForm
 * component works against either), but dedicated here because onboarding
 * always creates the user's first profile and forces is_primary=true.
 */

const ZoneSchema = z.object({
  partido: z.enum(PARTIDOS_ZONA_SUR),
  priority: z.enum(["preferido", "aceptable", "descarte"]),
});

const InputSchema = z.object({
  name: z.string().min(1).max(60),
  zones: z.array(ZoneSchema),
  operation_type: z.enum(["venta", "alquiler"]).nullable(),
  property_types: z
    .array(z.enum(["casa", "departamento", "ph", "lote", "local"]))
    .min(1, "Elegí al menos un tipo"),
  price_currency: z.enum(["USD", "ARS"]),
  price_min: z.number().int().min(0).nullable(),
  price_max: z.number().int().min(0).nullable(),
  rooms_min: z.number().int().min(0).max(20).nullable(),
  surface_min: z.number().int().min(0).max(10000).nullable(),
  must_haves: z.array(z.enum(KNOWN_MUST_HAVES)),
});

export async function createOnboardingProfile(
  raw: SearchProfileFormValues,
): Promise<SearchProfileActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { ok: false, error: "Sesión expirada. Iniciá sesión y reintentá." };
  }

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

  try {
    await createSearchProfile(userId, {
      ...parsed.data,
      is_primary: true,
    });
  } catch (err) {
    if (err instanceof SearchProfileLimitError) {
      return { ok: false, error: err.message };
    }
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return { ok: false, error: `No se pudo guardar tu búsqueda: ${msg}` };
  }

  redirect("/dashboard");
}
