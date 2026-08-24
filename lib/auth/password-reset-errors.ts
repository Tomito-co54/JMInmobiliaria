/**
 * Deciding what a failed password-reset request is allowed to say.
 *
 * The request endpoint deliberately reports success even when nothing was
 * sent, so an attacker can't use it to discover which addresses have an
 * account. That protection is correct, but applied to *every* failure it
 * also hides problems from the legitimate owner: Supabase caps auth emails
 * per hour and per address, and once the cap is hit the UI kept announcing
 * "Email enviado" while nothing left the server.
 *
 * Rate limiting is safe to surface. It depends on how often the *requester*
 * asked, not on whether the address exists — an attacker learns nothing from
 * it. Everything else stays silent.
 */

/** Supabase returns 429 once an email rate limit is hit. */
const RATE_LIMITED = 429;

/**
 * Returns a message to show the user, or null when the failure must stay
 * hidden to avoid leaking whether the account exists.
 */
export function describePasswordResetFailure(
  status: number | undefined,
): string | null {
  if (status === RATE_LIMITED) {
    return "Pediste varios links seguidos y Supabase está limitando los envíos. Esperá un minuto y probá de nuevo — el último link que te llegó sigue sirviendo.";
  }
  return null;
}
