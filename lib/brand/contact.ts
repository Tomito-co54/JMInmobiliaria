/**
 * Business contact info — single source of truth.
 *
 * Lives here (not scattered across components) so changing the broker's
 * WhatsApp / email is a one-line edit. Anything user-facing that lets an
 * interested buyer reach the broker should pull from this module.
 */

/**
 * WhatsApp number in full international form, digits only (no +, spaces or
 * dashes) — the format wa.me expects.
 *   +54 9 11 3286 2525  →  5491132862525
 */
export const WHATSAPP_NUMBER = "5491132862525";

/** Pretty version for display, if ever needed. */
export const WHATSAPP_DISPLAY = "+54 9 11 3286 2525";

/**
 * Builds a wa.me link with an optional pre-filled message. The message is
 * URL-encoded. When a property context is passed we name the address so the
 * very first message tells the broker which listing the lead is about.
 */
export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

/**
 * Default lead message for a property page. Falls back gracefully when the
 * address is missing.
 */
export function propertyLeadMessage(address: string | null): string {
  const ref = address?.trim() ? `“${address.trim()}”` : "una propiedad publicada";
  return `Hola Jotaeme, me interesa ${ref}. ¿Podemos coordinar?`;
}
