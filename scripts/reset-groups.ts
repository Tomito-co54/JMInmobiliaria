#!/usr/bin/env node
/**
 * Dev/admin utility: remove all property groups and clear group references
 * on properties. Use when refining matcher logic and starting fresh.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { count: before } = await supabase
    .from("property_groups")
    .select("*", { count: "exact", head: true });
  console.log(`Antes: ${before ?? 0} grupos`);

  // Clear FK on properties first
  const { error: updErr } = await supabase
    .from("properties")
    .update({ property_group_id: null })
    .not("property_group_id", "is", null);
  if (updErr) throw updErr;

  const { error: delErr } = await supabase
    .from("property_groups")
    .delete()
    .not("id", "is", null);
  if (delErr) throw delErr;

  const { count: after } = await supabase
    .from("property_groups")
    .select("*", { count: "exact", head: true });
  console.log(`Después: ${after ?? 0} grupos`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
