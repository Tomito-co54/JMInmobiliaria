"use server";

import { revalidatePath } from "next/cache";
import { addFavorite, isFavorited, removeFavorite } from "@/lib/db/favorites";
import { getCurrentUserId } from "@/lib/db/users";

/**
 * Server action invoked by <FavoriteButton>. Returns ok/error so the
 * client can roll back the optimistic UI on failure.
 *
 * Toggle semantics: if it was a favorite → remove; else → add. The
 * client passes the previous state implicitly (it's what's stored in
 * `useState`), but we re-check server-side to avoid races on a double-tap.
 */

export type FavoriteResult = { ok: true; favorited: boolean } | { ok: false; error: string };

export async function toggleFavoriteAction(propertyId: string): Promise<FavoriteResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { ok: false, error: "Iniciá sesión para guardar favoritos" };
  }

  try {
    const wasFavorited = await isFavorited(userId, propertyId);
    if (wasFavorited) {
      await removeFavorite(userId, propertyId);
    } else {
      await addFavorite(userId, propertyId);
    }
    revalidatePath("/favoritos");
    revalidatePath(`/p/${propertyId}`);
    return { ok: true, favorited: !wasFavorited };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return { ok: false, error: `No se pudo actualizar: ${msg}` };
  }
}
