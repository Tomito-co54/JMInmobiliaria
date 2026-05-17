import { NextResponse } from "next/server";

/**
 * Test endpoint that throws on purpose.
 * GET /api/sentry-test
 *
 * In production (with NEXT_PUBLIC_SENTRY_DSN set), the thrown error
 * should appear in your Sentry project's Issues feed within ~30s.
 *
 * Safe to keep in the repo: only the admin (or anyone with the URL) can
 * trigger it. Returns 500 always.
 */
export async function GET() {
  throw new Error(
    "Sentry test error from /api/sentry-test — if you see this in Sentry, the integration works.",
  );

  // Unreachable, but keeps the route handler type valid.
  return NextResponse.json({ ok: true });
}
