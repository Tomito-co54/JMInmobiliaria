#!/usr/bin/env node
/**
 * CLI: scrape Trezza Propiedades for a partido and persist to DB.
 *
 * Usage:
 *   tsx scripts/scrape-trezza.ts <partido> [maxProperties]
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { scrapeTrezza, PARTIDOS_SLUGS } from "@/lib/services/scrapers/trezza";

async function main() {
  const partido = process.argv[2];
  const maxProperties = process.argv[3] ? parseInt(process.argv[3], 10) : 100;

  if (!partido) {
    console.error("✗ Falta el partido.");
    console.error(`  Uso: tsx scripts/scrape-trezza.ts <partido> [maxProperties]`);
    console.error(`  Partidos válidos: ${Object.keys(PARTIDOS_SLUGS).join(", ")}`);
    process.exit(1);
  }

  if (!PARTIDOS_SLUGS[partido]) {
    console.error(`✗ Partido desconocido: "${partido}"`);
    console.error(`  Válidos: ${Object.keys(PARTIDOS_SLUGS).join(", ")}`);
    process.exit(1);
  }

  console.log(`\n=== Scraping Trezza Propiedades ===`);
  console.log(`  Partido:        ${partido}`);
  console.log(`  Max properties: ${maxProperties}\n`);

  const result = await scrapeTrezza({ partido, maxProperties });

  console.log(`\n=== Resultado ===`);
  console.log(`  Scrapeadas:        ${result.scrapedCount}`);
  console.log(`  Insertadas:        ${result.insertedCount}`);
  console.log(`  Actualizadas:      ${result.updatedCount}`);
  console.log(`  Desactivadas:      ${result.deactivatedCount}`);
  console.log(`  Errores:           ${result.errorCount}`);
  console.log(`  Duración:          ${(result.durationMs / 1000).toFixed(1)}s`);
}

main().catch((err) => {
  console.error("✗ Falla:", err);
  process.exit(1);
});
