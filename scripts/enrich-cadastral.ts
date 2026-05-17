#!/usr/bin/env node
/**
 * CLI: enrich properties with ARBA cadastral data.
 *
 * Usage:
 *   tsx scripts/enrich-cadastral.ts [limit]
 *
 * Examples:
 *   tsx scripts/enrich-cadastral.ts          # all properties with coords + no partida
 *   tsx scripts/enrich-cadastral.ts 5        # first 5 (smoke test)
 *
 * Notes:
 *   - Targets properties that have lat/lng but no partida yet.
 *   - Rate-limited internally to 1 req/sec against ARBA's WFS, so the
 *     network-bound runtime is ~1s per uncached property. Cache hits are instant.
 *   - Idempotent: properties already enriched short-circuit; negative-cached
 *     points won't re-hit ARBA for 180 days.
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { ensurePropertyCadastral } from "@/lib/services/arba/properties";

interface PropertyToEnrich {
  id: string;
  address: string | null;
  partido: string | null;
  lat: number | null;
  lng: number | null;
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
    .select("id, address, partido, lat, lng")
    .eq("is_active", true)
    .not("lat", "is", null)
    .is("nomenclatura_catastral", null)
    .order("created_at", { ascending: true });

  if (limit !== undefined) query = query.limit(limit);

  const { data, error } = await query;
  if (error) {
    console.error("✗ Falla al listar properties:", error.message);
    process.exit(1);
  }

  const properties = (data ?? []) as unknown as PropertyToEnrich[];
  console.log(`\n=== ARBA cadastral enrichment ===`);
  console.log(`  Properties con coords y sin partida: ${properties.length}`);
  if (properties.length === 0) {
    console.log(`  Nada para hacer. Salgo.`);
    return;
  }
  console.log(
    `  Tiempo estimado: ~${properties.length * 2}s (hasta 2 reqs/property: INTERSECTS + DWITHIN)\n`,
  );

  let intersectsCount = 0;
  let dwithinCount = 0;
  let cacheCount = 0;
  let notFoundCount = 0;
  let noCoordsCount = 0;
  let errorCount = 0;

  const start = Date.now();

  for (let i = 0; i < properties.length; i++) {
    const p = properties[i];
    const idx = `[${i + 1}/${properties.length}]`;
    const label = `${p.address ?? "(sin dirección)"} · ${p.partido ?? "?"}`;

    try {
      const result = await ensurePropertyCadastral(p.id);
      if (result.ok) {
        if (result.source === "cache") cacheCount++;
        else if (result.matchStrategy === "intersects") intersectsCount++;
        else if (result.matchStrategy === "dwithin") dwithinCount++;
        const surface = result.surfaceArba !== null ? `${result.surfaceArba}m²` : "—";
        const pda = result.partida ?? "(sin partida)";
        const dist =
          result.matchStrategy === "dwithin"
            ? ` (${result.distanceMeters.toFixed(1)}m off)`
            : "";
        console.log(
          `${idx} ✓ ${label} → pda=${pda} surf=${surface} [${result.source}/${result.matchStrategy}${dist}]`,
        );
      } else if (result.reason === "no_coords") {
        noCoordsCount++;
        console.log(`${idx} ⏭  ${label} → sin coords, skip`);
      } else {
        notFoundCount++;
        console.log(`${idx} ✗ ${label} → ARBA no encontró parcela en 30m`);
      }
    } catch (err) {
      errorCount++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${idx} ✗ ${label} → ERROR: ${msg}`);
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n=== Resultado ===`);
  console.log(`  Enriquecidas:           ${intersectsCount + dwithinCount + cacheCount}`);
  console.log(`    INTERSECTS (exacto):  ${intersectsCount}`);
  console.log(`    DWITHIN (cercano):    ${dwithinCount}`);
  console.log(`    desde cache:          ${cacheCount}`);
  console.log(`  Sin parcela en 30m:     ${notFoundCount}`);
  console.log(`  Sin coords:             ${noCoordsCount}`);
  console.log(`  Errores:                ${errorCount}`);
  console.log(`  Duración:               ${elapsed}s`);
}

main().catch((err) => {
  console.error("✗ Falla:", err);
  process.exit(1);
});
