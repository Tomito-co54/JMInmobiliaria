import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readCallbackErrorCode } from "@/lib/auth/callback-errors";

/**
 * OAuth + email link callback.
 *
 * Supabase redirects here after the user clicks a recovery or confirmation
 * link. The `code` query param is exchanged for a session; `next` says where
 * to go afterwards (default: /dashboard).
 *
 * Every failure path redirects to /login with a specific `?error=` code so
 * the page can explain what went wrong. Sending the user to a page with no
 * message — which is what this handler used to do — reads as "the site is
 * broken" and gives them nothing to act on.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get("next") ?? "/dashboard";

  const failWith = (code: string) =>
    NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(code)}`);

  // Supabase reports a rejected link on the redirect itself. Pass its code
  // through rather than flattening every cause into one generic failure.
  const reportedError = readCallbackErrorCode(searchParams);
  if (reportedError) {
    return failWith(reportedError);
  }

  const code = searchParams.get("code");
  if (!code) {
    return failWith("missing_code");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return failWith("exchange_failed");
  }

  return NextResponse.redirect(`${origin}${next}`);
}
