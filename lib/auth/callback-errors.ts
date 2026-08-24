/**
 * User-facing copy for authentication callback failures.
 *
 * Supabase reports a failed recovery / confirmation link in two different
 * shapes depending on the flow:
 *
 *   - PKCE (what the app itself uses): query params on the redirect,
 *     e.g. `/auth/callback?error=access_denied&error_code=otp_expired`
 *   - Implicit (admin-generated links, legacy templates): a URL *fragment*,
 *     e.g. `/#error=access_denied&error_code=otp_expired`
 *
 * The fragment never reaches the server — browsers strip everything after
 * `#` before sending the request — so a Route Handler is structurally
 * incapable of seeing it. That is why both paths funnel through this single
 * mapping: the server reads the query params, a client component reads the
 * fragment, and both render the same message.
 */

export interface CallbackNotice {
  /** Spanish, user-friendly. Never a raw provider string. */
  message: string;
  /** Whether offering a fresh /forgot-password link makes sense. */
  canRetry: boolean;
}

const FALLBACK: CallbackNotice = {
  message: "No pudimos completar el acceso. Probá de nuevo.",
  canRetry: true,
};

const NOTICES: Record<string, CallbackNotice> = {
  // Supabase / GoTrue codes
  otp_expired: {
    message:
      "El link venció o ya fue usado. Los links de recuperación sirven una sola vez.",
    canRetry: true,
  },
  access_denied: {
    message: "El link no es válido o ya fue usado.",
    canRetry: true,
  },
  server_error: {
    message: "Supabase rechazó el pedido. Esperá un momento y probá de nuevo.",
    canRetry: true,
  },
  validation_failed: {
    message: "El link llegó incompleto. Pedí uno nuevo.",
    canRetry: true,
  },

  // Codes this app emits itself, from /auth/callback
  missing_code: {
    message:
      "El link no traía el código de verificación. Suele pasar cuando el cliente de mail lo reescribe.",
    canRetry: true,
  },
  exchange_failed: {
    message:
      "No pudimos validar el link. Si lo abriste en otro navegador o dispositivo del que pediste la recuperación, repetí el pedido desde este mismo.",
    canRetry: true,
  },
};

/**
 * Translates a callback error code into something worth showing a person.
 * Unknown codes fall back to a generic message rather than leaking the raw
 * provider string into the UI.
 */
export function describeCallbackError(
  code: string | null | undefined,
): CallbackNotice {
  if (!code) return FALLBACK;
  return NOTICES[code] ?? FALLBACK;
}

/**
 * Picks the error code out of a `URLSearchParams`-shaped source, preferring
 * the specific `error_code` over the coarse `error`.
 *
 * Works for both the query string and a parsed fragment, which carry the
 * same parameter names.
 */
export function readCallbackErrorCode(
  params: URLSearchParams,
): string | null {
  return params.get("error_code") ?? params.get("error");
}
