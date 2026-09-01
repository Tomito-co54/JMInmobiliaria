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

/** Generic lead message for surfaces without a specific property (home, footer). */
export const GENERIC_LEAD_MESSAGE = "Hola Jotaeme, quiero hacer una consulta.";

/**
 * The broker's licence — the credibility anchor `DIRECCION_DE_ARTE` names
 * alongside verified data, and the only one of the three left on the public
 * face now that the Quality Score is gone.
 *
 * **Empty on purpose.** Nobody has typed the number yet, and a licence number
 * is not something that can be inferred, rounded or filled in with a
 * placeholder: printed on a public page it is a claim about a person's
 * standing before a professional body. Wrong or invented, it is worse than
 * absent.
 *
 * So absent is what it renders as. Everything that displays it checks
 * `hasMatricula()` first and simply does not draw, which is why the home
 * currently shows no gap where it will go. Fill the string in and the block
 * appears — that is the whole deploy.
 */
export const MARTILLERO = {
  /** Número de matrícula. Vacío = no se muestra en ningún lado. */
  matricula: "",
  /**
   * Colegio que la emite, si se quiere nombrar ("Colegio de Martilleros de
   * Lomas de Zamora"). Opcional: vacío se omite y el resto se muestra igual.
   */
  colegio: "",
} as const;

/**
 * Whether there is a licence to show.
 *
 * A function and not a boolean constant so the check reads the same at every
 * call site, and so trimming is done once here — a string of spaces is not a
 * licence, and it is exactly the kind of value that survives a hurried edit.
 */
export function hasMatricula(): boolean {
  return MARTILLERO.matricula.trim().length > 0;
}
