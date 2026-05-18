import { Resend } from "resend";

/**
 * Lazy Resend client.
 *
 * Returns null when `RESEND_API_KEY` isn't set — callers should treat that
 * as "email delivery is off" and skip gracefully. This lets the alert
 * detector run end-to-end in any environment (dev without keys, GitHub
 * Actions with keys, etc.) without conditional plumbing in the call sites.
 *
 * Returns null when `RESEND_FROM` isn't set either — sending without a
 * verified from-address would just bounce, and silently sending from the
 * Resend default (`onboarding@resend.dev`) would look amateurish.
 */

let cachedClient: Resend | null = null;

export function getResendClient(): Resend | null {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  cachedClient = new Resend(apiKey);
  return cachedClient;
}

export function getFromAddress(): string | null {
  return process.env.RESEND_FROM?.trim() || null;
}

/**
 * Origin URL used in email CTAs ("Ver en Jotaeme"). Falls back to the
 * production URL when unset so emails generated from local dev still point
 * at something real.
 */
export function getAppOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://jotaeme-beryl.vercel.app"
  );
}
