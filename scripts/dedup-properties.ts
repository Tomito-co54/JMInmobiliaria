#!/usr/bin/env node
/**
 * CLI: run the cross-source deduplication over all active properties.
 *
 * Usage: tsx scripts/dedup-properties.ts
 *
 * Idempotent — safe to re-run after each scrape.
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { runFuzzyAddressDedup } from "@/lib/services/dedup/matcher";

async function main() {
  console.log("\n=== Dedup batch (fuzzy_address) ===\n");
  const result = await runFuzzyAddressDedup();

  console.log(`Total activas:               ${result.totalScanned}`);
  console.log(`Con dirección normalizable:  ${result.withSignature}`);
  console.log(`Grupos nuevos creados:       ${result.groupsCreated}`);
  console.log(`Grupos existentes tocados:   ${result.groupsUpdated}`);
  console.log(`Listings asignados a grupo:  ${result.listingsAdded}`);
}

main().catch((err) => {
  console.error("✗ Falla:", err);
  process.exit(1);
});
