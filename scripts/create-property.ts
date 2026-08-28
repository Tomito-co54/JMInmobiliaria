/**
 * create-property.ts — carga una propiedad propia desde un archivo JSON.
 *
 * Uso:
 *   npx tsx scripts/create-property.ts propiedad.json
 *   npx tsx scripts/create-property.ts propiedad.json --publicar
 *   npx tsx scripts/create-property.ts propiedad.json --dry-run
 *
 * The admin form at /admin/properties/nueva does the same job through a
 * browser. This is the same steps without one, so a property can be loaded
 * from a description and a folder of photos.
 *
 * It reuses the loader's own pieces rather than reimplementing them —
 * the Zod schemas, the ARBA-by-partida lookup, the Storage helper, the
 * scorer. The Server Actions those live behind only add an admin session
 * check, which a local script run by the broker already satisfies.
 *
 * Writes as `source: 'owner_direct'` and `listing_status: 'borrador'`.
 * Publishing is opt-in (`--publicar`) and still goes through
 * `canPublishProperty`, so a half-loaded property cannot reach the catalog
 * by way of this script when it couldn't through the form.
 */

import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { parseImportPayload, isRemotePhoto, mimeForPhoto } from "@/lib/admin/property-import";
import { validatePartida } from "@/lib/zona-sur/partidos";
import { ensurePropertyCadastralByPartida } from "@/lib/services/arba/properties";
import { uploadPropertyPhoto } from "@/lib/storage/property-photos";
import { canPublishProperty } from "@/lib/validators/property";
import { ComparablesCache, recomputeQualityScore } from "@/lib/scoring";

dotenv.config({ path: ".env.local", quiet: true });

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const publish = args.includes("--publicar");
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");

function fail(msg: string): never {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) fail("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function photoToFile(ref: string): Promise<File> {
  const mime = mimeForPhoto(ref)!;
  if (isRemotePhoto(ref)) {
    const res = await fetch(ref);
    if (!res.ok) throw new Error(`HTTP ${res.status} al bajar ${ref}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return new File([buf], basename(new URL(ref).pathname), { type: mime });
  }
  const path = resolve(ref);
  const buf = await readFile(path);
  return new File([buf], basename(path), { type: mime });
}

async function main() {
  if (!file) {
    fail(
      "Uso: npx tsx scripts/create-property.ts <archivo.json> [--publicar] [--dry-run] [--force]",
    );
  }

  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(resolve(file), "utf8"));
  } catch (err) {
    fail(`No pude leer ${file}: ${err instanceof Error ? err.message : err}`);
  }

  const parsed = parseImportPayload(raw);
  for (const w of parsed.warnings) console.log(`  ⚠ ${w}`);
  if (!parsed.ok) {
    for (const e of parsed.errors) console.error(`  ✗ ${e}`);
    fail(`${parsed.errors.length} error(es) en el archivo. No se creó nada.`);
  }
  const { row, partida, photos, isFeatured } = parsed.payload!;

  // The partida's first three digits encode the partido; a mismatch means
  // one of the two is wrong, and it is cheaper to say so before writing.
  // The normalized form is what ARBA is queried with further down.
  let partidaNormalized: string | null = null;
  if (partida && row.partido) {
    const v = validatePartida(row.partido as string, partida);
    if (!v.ok) fail(v.message);
    partidaNormalized = v.normalized;
  } else if (partida) {
    fail("Hay partida pero falta el partido: sin él no se puede validar el prefijo.");
  }

  console.log("\n=== Propiedad a cargar ===");
  console.log(`  Dirección : ${row.address ?? "(sin dirección)"}`);
  console.log(`  Partido   : ${row.partido ?? "(sin partido)"}`);
  console.log(`  Partida   : ${partida ?? "(sin partida)"}`);
  console.log(`  Tipo      : ${row.property_type ?? "?"} · ${row.operation_type}`);
  console.log(`  Precio    : ${row.price_amount ?? "?"} ${row.price_currency}`);
  console.log(`  Fotos     : ${photos.length}`);
  console.log(`  Destacada : ${isFeatured ? "sí" : "no"}`);
  console.log(`  Publicar  : ${publish ? "sí" : "no (queda en borrador)"}`);

  if (dryRun) {
    console.log("\n--dry-run: no se escribió nada.\n");
    return;
  }

  const sb = admin();

  // Running the same file twice would otherwise silently duplicate a
  // listing, and duplicates in a two-property catalog are very visible.
  if (row.address && !force) {
    const { data: dupes } = await sb
      .from("properties")
      .select("id, address")
      .in("source", ["owner_direct", "agency"])
      .eq("address", row.address as string);
    if (dupes && dupes.length > 0) {
      fail(
        `Ya existe una propiedad propia en "${row.address}" (${(dupes[0] as { id: string }).id}). ` +
          `Usá --force si de verdad querés cargar otra.`,
      );
    }
  }

  const { data: created, error: insertErr } = await sb
    .from("properties")
    .insert({
      ...row,
      partida,
      source: "owner_direct",
      listing_status: "borrador",
      is_active: true,
      is_featured: isFeatured,
    } as never)
    .select("id")
    .single();
  if (insertErr) fail(`No pude crear la propiedad: ${insertErr.message}`);
  const id = (created as { id: string }).id;
  console.log(`\n✓ Borrador creado: ${id}`);

  // ARBA is explicitly non-fatal. The provincial service goes down, and a
  // listing shouldn't be lost because of it — same call the form's
  // "Consultar ARBA" button makes, same tolerance.
  if (partidaNormalized) {
    try {
      const r = await ensurePropertyCadastralByPartida(id, partidaNormalized);
      if (r.ok) {
        console.log(`✓ ARBA: ${r.nomenclatura} · ${r.surfaceArba ?? "?"} m² · ${r.tipo ?? "?"}`);
      } else {
        console.log(`  ⚠ ARBA no respondió con la parcela (${r.reason}). Queda sin verificar.`);
      }
    } catch (err) {
      console.log(`  ⚠ ARBA falló: ${err instanceof Error ? err.message : err}`);
    }
  }

  const uploaded: string[] = [];
  for (const [i, ref] of photos.entries()) {
    try {
      const f = await photoToFile(ref);
      const r = await uploadPropertyPhoto(id, f);
      if (r.ok && r.url) {
        uploaded.push(r.url);
        console.log(`✓ Foto ${i + 1}/${photos.length}: ${basename(ref)}`);
      } else {
        console.log(`  ⚠ Foto ${i + 1} falló: ${r.error}`);
      }
    } catch (err) {
      console.log(`  ⚠ Foto ${i + 1} falló: ${err instanceof Error ? err.message : err}`);
    }
  }
  if (uploaded.length > 0) {
    const { error } = await sb
      .from("properties")
      .update({ photos: uploaded } as never)
      .eq("id", id);
    if (error) console.log(`  ⚠ No pude guardar las fotos: ${error.message}`);
  }

  try {
    const breakdown = await recomputeQualityScore(id, new ComparablesCache());
    console.log(`✓ Quality score: ${breakdown?.score ?? "sin datos suficientes"}`);
  } catch (err) {
    console.log(`  ⚠ Score falló: ${err instanceof Error ? err.message : err}`);
  }

  if (publish) {
    const { data: fresh } = await sb
      .from("properties")
      .select(
        "property_type, operation_type, price_amount, price_currency, partido, partida, nomenclatura_catastral, address, photos",
      )
      .eq("id", id)
      .single();
    const check = canPublishProperty(fresh as never);
    if (!check.ok) {
      console.log(`\n  ⚠ No se publica, falta: ${check.missing.join(", ")}`);
      console.log("    Queda en borrador. Completá y publicá desde /admin.");
    } else {
      const { error } = await sb
        .from("properties")
        .update({ listing_status: "publicada" } as never)
        .eq("id", id);
      if (error) console.log(`  ⚠ No pude publicar: ${error.message}`);
      else console.log("✓ Publicada");
    }
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  console.log(`\n  Editor : ${base}/admin/properties/${id}/editar`);
  console.log(`  Pública: ${base}/p/${id}\n`);
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
