"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/validators/auth";
import type { ActionResult } from "@/app/(auth)/actions";

/**
 * Update the current user's profile (full_name, phone).
 */
export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Datos inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "No estás autenticado" };
  }

  const { error } = await supabase
    .from("users")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone || null,
    })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: "No pudimos actualizar tu perfil" };
  }

  revalidatePath("/perfil");
  return { ok: true };
}
