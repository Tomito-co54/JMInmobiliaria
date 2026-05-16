import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Routes that require an authenticated user.
 * Unauthenticated requests are redirected to /login (with ?redirect=<original-path>).
 */
const PROTECTED_PREFIXES = ["/dashboard", "/perfil", "/admin", "/onboarding"];

/**
 * Routes only accessible to anonymous users.
 * Authenticated requests are redirected to /dashboard.
 */
const ANON_ONLY_PREFIXES = ["/login", "/register"];

function isProtected(path: string) {
  return PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
}

function isAnonOnly(path: string) {
  return ANON_ONLY_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
}

/**
 * Refreshes the Supabase session AND enforces auth-based route protection.
 * Called from /middleware.ts at the repo root.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not write code between createServerClient and getUser().
  // This refreshes the session cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Unauthenticated user trying to access protected route → /login
  if (!user && isProtected(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  // Authenticated user trying to access /login or /register → /dashboard
  if (user && isAnonOnly(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
