#!/usr/bin/env node
/**
 * Read-only inspection of properties by source/partido.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Counts by source + status
  const sources = ["zonaprop", "argenprop", "trezza", "owner_direct", "agency"] as const;
  console.log("\n=== Propiedades por fuente ===");
  for (const source of sources) {
    const { count: active } = await supabase
      .from("properties")
      .select("*", { count: "exact", head: true })
      .eq("source", source)
      .eq("is_active", true);
    const { count: total } = await supabase
      .from("properties")
      .select("*", { count: "exact", head: true })
      .eq("source", source);
    if ((total ?? 0) > 0) {
      console.log(`  ${source.padEnd(15)} ${active ?? 0} activas / ${total ?? 0} totales`);
    }
  }

  // Per partido
  console.log("\n=== Activas por partido ===");
  const { data: partidoRows } = await supabase
    .from("properties")
    .select("partido")
    .eq("is_active", true);
  const partidoCounts = new Map<string, number>();
  for (const r of partidoRows ?? []) {
    if (r.partido) partidoCounts.set(r.partido, (partidoCounts.get(r.partido) ?? 0) + 1);
  }
  for (const [partido, count] of [...partidoCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${partido.padEnd(20)} ${count}`);
  }

  // Sample 5 most recent
  console.log("\n=== Últimas 5 cargadas ===");
  const { data: recent } = await supabase
    .from("properties")
    .select("external_id, source, property_type, address, partido, price_amount, price_currency, rooms")
    .eq("is_active", true)
    .order("first_seen_at", { ascending: false })
    .limit(5);
  for (const p of recent ?? []) {
    console.log(
      `  [${p.source}/${p.external_id}] ${p.property_type ?? "?"} ${p.address ?? "(sin dir.)"} - ${p.price_currency ?? "?"} ${p.price_amount?.toLocaleString("es-AR") ?? "?"}`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
