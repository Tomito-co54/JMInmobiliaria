/**
 * Client-side Sentry initialization.
 * Runs in the browser. Picked up automatically by @sentry/nextjs.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled:
    process.env.NODE_ENV === "production" &&
    !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Performance: sample 10% of transactions
  tracesSampleRate: 0.1,
  // Session replay: only on errors, low rate
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0.1,
  // Privacy
  sendDefaultPii: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
