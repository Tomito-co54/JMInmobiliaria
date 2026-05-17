/**
 * Next.js instrumentation hook.
 * Runs once per server (Node + Edge runtimes) to register monitoring tools.
 *
 * Sentry is initialized here for server-side error capture.
 * Client-side init lives in `instrumentation-client.ts`.
 */
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      enabled:
        process.env.NODE_ENV === "production" &&
        !!process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
      // Don't send default PII (cookies, IP). Set explicitly per event when needed.
      sendDefaultPii: false,
      beforeSend: scrubSensitiveData,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      enabled:
        process.env.NODE_ENV === "production" &&
        !!process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
      sendDefaultPii: false,
      beforeSend: scrubSensitiveData,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;

/**
 * Strip obvious secrets from error events before they leave the server.
 * Belt-and-suspenders: with sendDefaultPii=false, most of this is already off.
 */
function scrubSensitiveData(
  event: Sentry.ErrorEvent,
): Sentry.ErrorEvent | null {
  const SENSITIVE_KEYS = [
    "password",
    "passwd",
    "token",
    "access_token",
    "refresh_token",
    "service_role_key",
    "supabase_service_role_key",
    "authorization",
    "cookie",
    "dni",
    "mercadopago_access_token",
    "card",
    "card_number",
    "cvv",
  ];

  function scrub<T>(obj: T): T {
    if (!obj || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(scrub) as T;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s))) {
        out[k] = "[REDACTED]";
      } else if (v && typeof v === "object") {
        out[k] = scrub(v);
      } else {
        out[k] = v;
      }
    }
    return out as T;
  }

  if (event.request) event.request = scrub(event.request);
  if (event.extra) event.extra = scrub(event.extra);
  if (event.contexts) event.contexts = scrub(event.contexts);
  return event;
}
