#!/usr/bin/env node
/**
 * Quick read-only inspection of recently scraped properties.
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await supabase
    .from("properties")
    .select(
      "external_id, address, partido, property_type, price_amount, price_currency, surface_total, rooms, is_active, first_seen_at",
    )
    .eq("source", "zonaprop")
    .eq("is_active", true)
    .order("first_seen_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }

  console.log(`\nActive Zonaprop properties (${data?.length ?? 0} found):\n`);
  for (const p of data ?? []) {
    console.log(
      `[${p.external_id}] ${p.property_type ?? "?"} - ${p.address ?? "(no address)"}`,
    );
    console.log(
      `  ${p.partido} - ${p.price_currency ?? "?"} ${p.price_amount?.toLocaleString("es-AR") ?? "?"} - ${p.surface_total ?? "?"}m² - ${p.rooms ?? "?"} amb`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
