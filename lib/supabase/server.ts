import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Creates a Supabase client for use in Server Components, Server Actions,
 * and Route Handlers. Reads/writes cookies for session management.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method is called from a Server Component where
            // cookies can't be set. This can be safely ignored if middleware
            // is refreshing user sessions.
          }
        },
      },
    }
  );
}

/**
 * Creates a Supabase admin client using the service role key.
 * NEVER use this client-side. Only for server-side admin operations.
 */
export function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    }
  );
}

/**
 * Anon client with no cookie access, for data that is identical for every
 * visitor.
 *
 * `createClient` reads cookies, and anything that reads cookies cannot live
 * inside `unstable_cache` — the cache has no request to read them from. That
 * is the practical reason this exists. The design reason is better: a query
 * whose answer does not depend on who is asking should not be handed the
 * caller's session, and this client cannot see past what RLS grants anon,
 * which is exactly the ceiling public data should have.
 *
 * Not a replacement for `createAdminClient`: that one bypasses RLS with the
 * service role and is for admin work. This one is the opposite — the least
 * privilege available.
 */
export function createPublicClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    },
  );
}
