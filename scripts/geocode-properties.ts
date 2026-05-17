#!/usr/bin/env node
/**
 * CLI: geocode active properties that don't yet have lat/lng.
 *
 * Usage:
 *   tsx scripts/geocode-properties.ts [limit]
 *
 * Examples:
 *   tsx scripts/geocode-properties.ts          # all missing-coord properties
 *   tsx scripts/geocode-properties.ts 5        # first 5 (handy for smoke tests)
 *
 * Notes:
 *   - Rate-limited internally to 1 req/sec against Nominatim, so this script
 *     takes ~N seconds for N uncached properties. Cache hits are instant.
 *   - Idempotent: properties that already have lat/lng are skipped at the
 *     SQL level (no_address / not_found results don't get retried unless you
 *     wipe the geocoding_cache row).
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { ensurePropertyCoordinates } from "@/lib/services/geocoding/properties";

interface PropertyToGeocode {
  id: string;
  address: string | null;
  partido: string | null;
}

async function main() {
  const limit = process.argv[2] ? parseInt(process.argv[2], 10) : undefined;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("✗ Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
    process.exit(1);
  }
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  let query = supabase
    .from("properties")
    .select("id, address, partido")
    .eq("is_active", true)
    .is("lat", null)
    .order("created_at", { ascending: true });

  if (limit !== undefined) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) {
    console.error("✗ Falla al listar properties:", error.message);
    process.exit(1);
  }

  const properties = (data ?? []) as unknown as PropertyToGeocode[];
  console.log(`\n=== Geocoding (Nominatim) ===`);
  console.log(`  Properties activas sin coordenadas: ${properties.length}`);
  if (properties.length === 0) {
    console.log(`  Nada para hacer. Salgo.`);
    return;
  }
  console.log(
    `  Tiempo estimado: ~${properties.length}s (1 req/s, cache hits son instantáneos)\n`,
  );

  let okCount = 0;
  let cacheCount = 0;
  let networkCount = 0;
  let notFoundCount = 0;
  let noAddressCount = 0;
  let errorCount = 0;

  const start = Date.now();

  for (let i = 0; i < properties.length; i++) {
    const p = properties[i];
    const idx = `[${i + 1}/${properties.length}]`;
    const label = `${p.address ?? "(sin dirección)"} · ${p.partido ?? "?"}`;

    try {
      const result = await ensurePropertyCoordinates(p.id);
      if (result.ok) {
        okCount++;
        if (result.source === "cache") cacheCount++;
        else if (result.source === "nominatim") networkCount++;
        console.log(
          `${idx} ✓ ${label} → (${result.lat.toFixed(4)}, ${result.lng.toFixed(4)}) [${result.source}]`,
        );
      } else if (result.reason === "no_address") {
        noAddressCount++;
        console.log(`${idx} ⏭  ${label} → sin dirección, skip`);
      } else {
        notFoundCount++;
        console.log(`${idx} ✗ ${label} → no encontrado por Nominatim`);
      }
    } catch (err) {
      errorCount++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${idx} ✗ ${label} → ERROR: ${msg}`);
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n=== Resultado ===`);
  console.log(`  Geocodificadas:      ${okCount}`);
  console.log(`    desde Nominatim:   ${networkCount}`);
  console.log(`    desde cache:       ${cacheCount}`);
  console.log(`  No encontradas:      ${notFoundCount}`);
  console.log(`  Sin dirección:       ${noAddressCount}`);
  console.log(`  Errores:             ${errorCount}`);
  console.log(`  Duración:            ${elapsed}s`);
}

main().catch((err) => {
  console.error("✗ Falla:", err);
  process.exit(1);
});
