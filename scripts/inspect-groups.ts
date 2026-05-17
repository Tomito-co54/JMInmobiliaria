#!/usr/bin/env node
/**
 * Read-only: show all property groups + the listings in each.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: groups, error } = await supabase
    .from("property_groups")
    .select("id, signature, matched_by, primary_listing_id")
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  console.log(`\n=== Grupos (${groups?.length ?? 0}) ===\n`);

  for (const g of groups ?? []) {
    const { data: listings } = await supabase
      .from("properties")
      .select("id, source, external_id, address, price_amount, price_currency")
      .eq("property_group_id", g.id);

    console.log(`Grupo ${g.id.slice(0, 8)}... (${g.matched_by})`);
    console.log(`  signature: ${g.signature}`);
    console.log(`  ${listings?.length ?? 0} listings:`);
    for (const l of listings ?? []) {
      const isPrimary = l.id === g.primary_listing_id ? " ★" : "";
      console.log(
        `    - [${l.source}/${l.external_id}] ${l.address ?? "(sin dir)"} - ${l.price_currency ?? "?"} ${l.price_amount?.toLocaleString("es-AR") ?? "?"}${isPrimary}`,
      );
    }
    console.log("");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
