import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for the scoring module. Mirrors the pattern
 * in lib/services/arba/client.ts. Scoring reads from properties, arba_lookups
 * and property_history, and writes back quality_score + quality_score_breakdown.
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
