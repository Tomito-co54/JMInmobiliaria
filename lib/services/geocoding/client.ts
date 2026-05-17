import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for the geocoding module. We need this because
 * geocoding_cache has RLS that only grants read access to admins, and writes
 * are denied to everyone except service_role.
 *
 * Same singleton pattern as scrapers/persistence.ts.
 */

let cachedClient: ReturnType<typeof createClient> | null = null;

export function getAdminClient() {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env",
    );
  }
  cachedClient = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
  return cachedClient;
}
