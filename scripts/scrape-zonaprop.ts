#!/usr/bin/env node
/**
 * CLI: scrape Zonaprop for a partido and persist to DB.
 *
 * Usage:
 *   tsx scripts/scrape-zonaprop.ts <partido> [maxProperties] [maxPages]
 *
 * Examples:
 *   tsx scripts/scrape-zonaprop.ts "Lomas de Zamora"
 *   tsx scripts/scrape-zonaprop.ts "Lomas de Zamora" 100 5
 *   tsx scripts/scrape-zonaprop.ts Banfield 25 2
 *
 * Reads env from .env.local (Supabase URL + service role key required).
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { scrapeZonaprop, PARTIDOS_SLUGS } from "@/lib/services/scrapers/zonaprop";

async function main() {
  const partido = process.argv[2];
  const maxProperties = process.argv[3] ? parseInt(process.argv[3], 10) : 50;
  const maxPages = process.argv[4] ? parseInt(process.argv[4], 10) : 5;

  if (!partido) {
    console.error("✗ Falta el partido.");
    console.error(`  Uso: tsx scripts/scrape-zonaprop.ts <partido> [maxProperties] [maxPages]`);
    console.error(`  Partidos válidos: ${Object.keys(PARTIDOS_SLUGS).join(", ")}`);
    process.exit(1);
  }

  if (!PARTIDOS_SLUGS[partido]) {
    console.error(`✗ Partido desconocido: "${partido}"`);
    console.error(`  Válidos: ${Object.keys(PARTIDOS_SLUGS).join(", ")}`);
    process.exit(1);
  }

  console.log(`\n=== Scraping Zonaprop ===`);
  console.log(`  Partido:        ${partido}`);
  console.log(`  Max properties: ${maxProperties}`);
  console.log(`  Max pages:      ${maxPages}\n`);

  const result = await scrapeZonaprop({ partido, maxProperties, maxPages });

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
