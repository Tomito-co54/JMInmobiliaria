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
 * The steps themselves live in `lib/admin/property-loader.ts`, shared with
 * `sincronizar-cartera.ts`. This file only reads the JSON, prints what it is
 * about to do, and refuses to duplicate an address unless told otherwise.
 *
 * Writes as `source: 'owner_direct'` and `listing_status: 'borrador'`.
 * Publishing is opt-in (`--publicar`) and still goes through
 * `canPublishProperty`, so a half-loaded property cannot reach the catalog
 * by way of this script when it couldn't through the form.
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { parseImportPayload } from "@/lib/admin/property-import";
import { findOwnerPropertyByAddress, loadProperty, normalizeCadastral } from "@/lib/admin/property-loader";
import { readTags, tagLabel } from "@/lib/property/tags";

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
  const payload = parsed.payload!;
  const { row, partida, photos, isFeatured } = payload;

  let cad: { partida: string | null; nomenclatura: string | null };
  try {
    cad = normalizeCadastral(payload);
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }

  console.log("\n=== Propiedad a cargar ===");
  console.log(`  Dirección : ${row.address ?? "(sin dirección)"}`);
  console.log(`  Partido   : ${row.partido ?? "(sin partido)"}`);
  console.log(`  Partida   : ${partida ?? "(sin partida)"}`);
  if (cad.nomenclatura) {
    console.log(`  Parcela   : ${cad.nomenclatura} (por nomenclatura — unidad de PH)`);
  }
  console.log(`  Tipo      : ${row.property_type ?? "?"} · ${row.operation_type}`);
  console.log(`  Precio    : ${row.price_amount ?? "?"} ${row.price_currency}`);
  console.log(`  Fotos     : ${photos.length}`);
  console.log(`  Etiquetas : ${readTags(row.tags).map(tagLabel).join(", ") || "(ninguna)"}`);
  console.log(`  Destacada : ${isFeatured ? "sí" : "no"}`);
  console.log(`  Publicar  : ${publish ? "sí" : "no (queda en borrador)"}`);

  if (dryRun) {
    console.log("\n--dry-run: no se escribió nada.\n");
    return;
  }

  const sb = admin();

  // Running the same file twice would otherwise silently duplicate a
  // listing, and duplicates in a small catalog are very visible. The sync
  // script is the one that updates in place; this CLI only creates.
  if (row.address && !force) {
    const dupes = await findOwnerPropertyByAddress(sb, row.address as string);
    if (dupes.length > 0) {
      fail(
        `Ya existe una propiedad propia en "${row.address}" (${dupes[0].id}). ` +
          `Usá --force si de verdad querés cargar otra, o npm run sincronizar-cartera para actualizarla.`,
      );
    }
  }

  const result = await loadProperty(sb, payload, {
    existingId: null,
    status: publish ? "publicada" : null,
    updatePrice: true,
    replacePhotos: false,
    log: (line) => console.log(line),
  });
  if (publish && result.status !== "publicada") {
    console.log("    Queda en borrador. Completá y publicá desde /admin.");
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  console.log(`\n  Editor : ${base}/admin/properties/${result.id}/editar`);
  console.log(`  Pública: ${base}/p/${result.id}\n`);
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
