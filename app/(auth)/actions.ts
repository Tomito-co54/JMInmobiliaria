"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validators/auth";

/**
 * Server Actions for authentication flows.
 *
 * Public registration was removed in the pivot to the personal-broker
 * model — there is no `signUp` or OAuth here anymore. The owner logs in
 * with email + password via /login (`signIn`), can reset their password
 * via /forgot-password → /reset-password, and signs out via `signOut`.
 *
 * All actions return { ok: true } or { ok: false, error: string }.
 * Errors are user-friendly Spanish messages.
 */

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Build the absolute origin URL (e.g. https://jotaeme.com).
 * Used for OAuth and email redirects.
 */
async function getOrigin() {
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

/**
 * Sign in with email + password.
 */
export async function signIn(formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Datos inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    if (error.message.includes("Invalid login credentials")) {
      return { ok: false, error: "Email o contraseña incorrectos" };
    }
    if (error.message.includes("Email not confirmed")) {
      return {
        ok: false,
        error: "Necesitás confirmar tu email antes de iniciar sesión",
      };
    }
    return { ok: false, error: "No pudimos iniciar sesión. Intentá de nuevo." };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/**
 * Sign out the current user.
 */
export async function signOut(): Promise<ActionResult> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

/**
 * Send password recovery email.
 */
export async function requestPasswordReset(
  formData: FormData,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Email inválido",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const origin = await getOrigin();

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${origin}/reset-password`,
    },
  );

  // Note: we always return ok=true to prevent email enumeration attacks.
  // If the email doesn't exist, Supabase silently does nothing.
  if (error) {
    console.error("Password reset error:", error);
  }

  return { ok: true };
}

/**
 * Update password (after clicking the reset link in email).
 * The user must be in a recovery session at this point.
 */
export async function resetPassword(formData: FormData): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Contraseña inválida",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return {
      ok: false,
      error: "No pudimos actualizar la contraseña. El link puede haber expirado.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
