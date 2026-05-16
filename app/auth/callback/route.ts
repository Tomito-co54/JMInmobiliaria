import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth + Email confirmation callback.
 *
 * Supabase redirects here after:
 *   - User clicks the email confirmation link (signup)
 *   - User clicks the magic link
 *   - Google OAuth completes
 *
 * The `code` query param is exchanged for a session.
 * The `next` param tells us where to redirect afterwards (default: /dashboard).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth failed — send to login with a generic error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
