#!/usr/bin/env node
/**
 * CLI: recompute quality scores for all active properties.
 *
 * Usage:
 *   tsx scripts/score-properties.ts [limit]
 *
 * Examples:
 *   tsx scripts/score-properties.ts          # all active properties
 *   tsx scripts/score-properties.ts 10       # first 10 (smoke test)
 *
 * Notes:
 *   - Pre-fetches comparable stats for every (partido, type) cluster once
 *     up front, so per-property scoring is two cheap reads (property +
 *     ARBA lookup + history).
 *   - Idempotent: re-running on the same data produces the same scores
 *     (modulo `computed_at`).
 *   - Designed to run as the final step of the GitHub Actions pipeline,
 *     after scrape → dedup → geocode → ARBA.
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { ComparablesCache, recomputeQualityScore } from "@/lib/scoring";

interface PropertyToScore {
  id: string;
  address: string | null;
  partido: string | null;
  property_type: string | null;
}

async function main() {
  const limit = process.argv[2] ? parseInt(process.argv[2], 10) : undefined;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      "✗ Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local",
    );
    process.exit(1);
  }
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  let query = supabase
    .from("properties")
    .select("id, address, partido, property_type")
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (limit !== undefined) query = query.limit(limit);

  const { data, error } = await query;
  if (error) {
    console.error("✗ Falla al listar properties:", error.message);
    process.exit(1);
  }
  const properties = (data ?? []) as unknown as PropertyToScore[];

  console.log(`\n=== Quality scoring ===`);
  console.log(`  Properties activas: ${properties.length}`);
  if (properties.length === 0) {
    console.log(`  Nada para hacer. Salgo.`);
    return;
  }

  console.log(`\n  Calentando cache de comparables...`);
  const comparables = new ComparablesCache();
  await comparables.warmUp();
  const entries = comparables.entries();
  console.log(`  Clusters (partido × tipo): ${entries.length}`);
  for (const e of entries.sort(
    (a, b) => b.stats.sampleSize - a.stats.sampleSize,
  )) {
    const median = e.stats.medianPricePerM2Usd?.toFixed(0) ?? "—";
    console.log(
      `    ${e.partido} · ${e.propertyType} → n=${e.stats.sampleSize}, mediana USD ${median}/m²`,
    );
  }
  console.log("");

  let okCount = 0;
  let nullCount = 0; // insufficient_data
  let errorCount = 0;
  const buckets = { rojo: 0, amarillo: 0, verde: 0 };

  const start = Date.now();

  for (let i = 0; i < properties.length; i++) {
    const p = properties[i];
    const idx = `[${i + 1}/${properties.length}]`;
    const label = `${p.address ?? "(sin dirección)"} · ${p.property_type ?? "?"} · ${p.partido ?? "?"}`;

    try {
      const breakdown = await recomputeQualityScore(p.id, comparables);
      if (breakdown.score === null) {
        nullCount++;
        console.log(`${idx} ⏭  ${label} → null (insufficient_data)`);
      } else {
        okCount++;
        const score = breakdown.score;
        if (score < 40) buckets.rojo++;
        else if (score < 70) buckets.amarillo++;
        else buckets.verde++;
        const ratio = (breakdown.effective_weight_ratio * 100).toFixed(0);
        console.log(`${idx} ✓ ${label} → ${score} (peso efectivo ${ratio}%)`);
      }
    } catch (err) {
      errorCount++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${idx} ✗ ${label} → ERROR: ${msg}`);
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n=== Resultado ===`);
  console.log(`  Scored:              ${okCount}`);
  console.log(`    🟢 verde (70+):    ${buckets.verde}`);
  console.log(`    🟡 amarillo (40-69): ${buckets.amarillo}`);
  console.log(`    🔴 rojo (<40):     ${buckets.rojo}`);
  console.log(`  Insufficient data:   ${nullCount}`);
  console.log(`  Errores:             ${errorCount}`);
  console.log(`  Duración:            ${elapsed}s`);
}

main().catch((err) => {
  console.error("✗ Falla:", err);
  process.exit(1);
});
