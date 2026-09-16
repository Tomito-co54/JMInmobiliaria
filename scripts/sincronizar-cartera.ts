/**
 * sincronizar-cartera.ts — la cartera de Tomy (PLANILLA MAESTRA + carpeta
 * Publicación/) hacia el sitio, unidad por unidad.
 *
 * Uso:
 *   npm run sincronizar-cartera                         # modo prueba: lee, compara, no escribe
 *   npm run sincronizar-cartera -- --direccion "Belgrano 1287"
 *   npm run sincronizar-cartera -- --direccion "Belgrano 1287" --unidad 1A
 *   npm run sincronizar-cartera -- --direccion "Belgrano 1287" --aplicar
 *   npm run sincronizar-cartera -- ... --aplicar --precios   # también pisa el precio de las ya cargadas
 *   npm run sincronizar-cartera -- ... --aplicar --fotos     # también reemplaza la galería de las ya cargadas
 *   npm run sincronizar-cartera -- ... --json                # imprime cada ficha.json completa
 *
 * The contract is PUBLICACION.md in the Inmobiliaria folder. In short:
 *   - The maestra is the source of truth. `ficha.json` is generated from it
 *     plus what `Publicación/<Unidad>/` holds (photos, and `provisorio.json`
 *     for the columns the sheet does not have yet).
 *   - This script reads `Propiedades/`, writes ONLY `Publicación/<Unidad>/ficha.json`,
 *     and never touches the maestra, `Documentación/`, `Contratos/` or `Fotos/`.
 *   - Modo prueba is the default. `--aplicar` is what writes: the ficha, and
 *     then the site through `lib/admin/property-loader.ts` (create or update).
 *
 * Fail-closed on purpose, three times over:
 *   - No `Publicar` column → the decision is UNKNOWN. Units are then taken
 *     only from an explicit `--direccion` AND an existing `Publicación/<Unidad>/`
 *     folder, and their listing_status is never changed.
 *   - A price that differs from the site's is reported and NOT written unless
 *     `--precios` is given: the sheet's prices are known to lag.
 *   - The gallery of an already-loaded unit is NOT replaced unless `--fotos`.
 */

import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import dotenv from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  buildFicha,
  diffAgainstSite,
  findPartida,
  isStandaloneGarage,
  isThirdParty,
  publishDecision,
  sameListingAddress,
  siteAddress,
  unitFolderName,
  unpublishedStatus,
  type Provisorio,
  type UnidadRow,
} from "@/lib/admin/cartera-sync";
import { readMaestra, type Maestra } from "@/lib/admin/maestra";
import { mimeForPhoto, parseImportPayload } from "@/lib/admin/property-import";
import { findOwnerPropertyByAddress, loadProperty, type TargetStatus } from "@/lib/admin/property-loader";
import { formatPrice, type PriceCurrency } from "@/lib/property/price";
import { normalizePartida } from "@/lib/zona-sur/partidos";

dotenv.config({ path: ".env.local", quiet: true });

// ─── Args ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function flagValue(name: string): string | null {
  const i = args.indexOf(name);
  if (i === -1) return null;
  return args[i + 1] ?? null;
}
const APLICAR = args.includes("--aplicar");
const PRECIOS = args.includes("--precios");
const FOTOS = args.includes("--fotos");
const JSON_OUT = args.includes("--json");
const FILTER_DIRECCION = flagValue("--direccion");
const FILTER_UNIDAD = flagValue("--unidad");

const ROOT = resolve(
  flagValue("--carpeta") ?? process.env.CARTERA_DIR ?? "C:/Users/tomit/OneDrive/Escritorio/Inmobiliaria",
);
const MAESTRA = join(ROOT, "PLANILLA MAESTRA - Inmobiliaria.xlsx");

function fail(msg: string): never {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

function admin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) fail("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

// ─── Folder side ─────────────────────────────────────────────────────────────

interface UnitFolder {
  dir: string;
  photos: string[];
  ignored: string[];
  provisorio: Provisorio | null;
  provisorioError: string | null;
}

function buildingDir(row: UnidadRow): string {
  // `Carpeta en disco` is relative to the Inmobiliaria root and is the one
  // place that knows about spellings like "Pellegrini & Portela".
  const rel = row.carpetaEnDisco?.trim() || join("Propiedades", "Familiar", row.direccion);
  return resolve(ROOT, rel);
}

async function readUnitFolder(row: UnidadRow): Promise<UnitFolder | null> {
  if (!row.unidad) return null;
  const dir = join(buildingDir(row), "Publicación", unitFolderName(row.unidad));
  if (!(await exists(dir))) return null;

  const photos: string[] = [];
  const ignored: string[] = [];
  const fotosDir = join(dir, "fotos");
  if (await exists(fotosDir)) {
    for (const name of (await readdir(fotosDir)).sort((a, b) => a.localeCompare(b, "es", { numeric: true }))) {
      if (name.startsWith("_BORRAR") || name.startsWith(".")) continue;
      if (mimeForPhoto(name)) photos.push(join(fotosDir, name));
      else ignored.push(name);
    }
  }

  let provisorio: Provisorio | null = null;
  let provisorioError: string | null = null;
  const provPath = join(dir, "provisorio.json");
  if (await exists(provPath)) {
    try {
      provisorio = JSON.parse(await readFile(provPath, "utf8"));
    } catch (err) {
      provisorioError = `provisorio.json ilegible: ${err instanceof Error ? err.message : err}`;
    }
  }
  return { dir, photos, ignored, provisorio, provisorioError };
}

// ─── Site side ───────────────────────────────────────────────────────────────

const SITE_FIELDS =
  "id, listing_status, property_type, operation_type, price_amount, price_currency, description, surface_total, surface_covered, rooms, bedrooms, bathrooms, garages, year_built, partida, nomenclatura_catastral, tags, extras, photos, is_featured";

async function readSiteRow(sb: SupabaseClient, id: string): Promise<Record<string, unknown>> {
  const { data, error } = await sb.from("properties").select(SITE_FIELDS).eq("id", id).single();
  if (error) throw new Error(`No pude leer la propiedad ${id}: ${error.message}`);
  return data as Record<string, unknown>;
}

interface SiteRef {
  id: string;
  address: string | null;
  listing_status: string | null;
}
let ownerRowsCache: SiteRef[] | null = null;

/**
 * The owner rows that are this listing. Exact address first; failing that,
 * the same address without a trailing locality ("Talcahuano 258" in the
 * maestra is "Talcahuano 258, Banfield" on the site), so a spelling
 * difference cannot turn into a duplicate.
 */
async function findSite(sb: SupabaseClient, address: string): Promise<{ rows: SiteRef[]; byLocality: boolean }> {
  const exact = await findOwnerPropertyByAddress(sb, address);
  if (exact.length > 0) return { rows: exact.map((r) => ({ ...r, address })), byLocality: false };
  if (!ownerRowsCache) {
    const { data, error } = await sb
      .from("properties")
      .select("id, address, listing_status")
      .in("source", ["owner_direct", "agency"]);
    if (error) throw new Error(`No pude leer las propiedades del sitio: ${error.message}`);
    ownerRowsCache = (data ?? []) as SiteRef[];
  }
  const near = ownerRowsCache.filter((r) => !!r.address && sameListingAddress(r.address, address));
  return { rows: near, byLocality: near.length > 0 };
}

// ─── Report helpers ──────────────────────────────────────────────────────────

function fmt(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (Array.isArray(v)) return JSON.stringify(v);
  if (typeof v === "object") return JSON.stringify(v);
  const s = String(v);
  return s.length > 70 ? `${s.slice(0, 67)}…` : s;
}

function money(amount: unknown, currency: unknown): string {
  const n = Number(amount);
  if (amount === null || amount === undefined || !Number.isFinite(n)) return "—";
  return formatPrice(n, (currency ?? "USD") as PriceCurrency, null) ?? "—";
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if (!(await exists(MAESTRA))) fail(`No encuentro la maestra en ${MAESTRA}`);

  console.log(`\nCarpeta : ${ROOT}`);
  console.log(`Modo    : ${APLICAR ? "APLICAR (escribe ficha.json y carga en el sitio)" : "prueba (no escribe nada)"}`);
  if (APLICAR) console.log(`Flags   : precios=${PRECIOS ? "sí" : "no"} · fotos=${FOTOS ? "sí" : "no"}`);

  const maestra: Maestra = await readMaestra(MAESTRA);
  console.log(`\nMaestra : ${maestra.unidades.length} filas en Unidades · ${maestra.partidas.length} partidas legibles`);
  const missing = (["publicar", "direccionReal", "operacion"] as const).filter((c) => !maestra.columns[c]);
  if (missing.length) {
    console.log(`  ⚠ Columnas que todavía no existen: ${missing.join(", ")}`);
  }
  if (!maestra.columns.publicar && !FILTER_DIRECCION) {
    fail(
      'La maestra no tiene la columna "Publicar", así que no sé qué unidades querés en el sitio. ' +
        'Pasá --direccion "Belgrano 1287" para probar contra un edificio con carpeta Publicación/.',
    );
  }

  const sb = admin();

  // Selection. With the Publicar column: every Activa + Sí, plus anything
  // already on the site whose row now says otherwise (so it can be taken
  // down). Without it: explicit --direccion and an existing unit folder.
  let rows = maestra.unidades;
  if (FILTER_DIRECCION) rows = rows.filter((r) => r.direccion.toLowerCase() === FILTER_DIRECCION.toLowerCase());
  if (FILTER_UNIDAD) {
    rows = rows.filter((r) => r.unidad && unitFolderName(r.unidad).toLowerCase() === FILTER_UNIDAD.toLowerCase());
  }
  if (rows.length === 0) fail("Ningún renglón de la maestra coincide con el filtro.");

  let ok = 0;
  let skipped = 0;
  let failed = 0;
  // For the closing summary: what the sheet wants vs what the disk has.
  const ready: string[] = [];
  const missingMaterial: { label: string; why: string }[] = [];
  const garages: string[] = [];
  const folderNotPublish: { label: string; reason: string }[] = [];
  let markedNo = 0;
  let unmarked = 0;
  const seenAddresses = new Set<string>();
  const onSiteNoFolder: { label: string; address: string }[] = [];

  for (const row of rows) {
    const label = `${row.direccion} · ${row.unidad ?? "(sin unidad)"}`;
    const decision = publishDecision(row, maestra.columns);
    const folder = await readUnitFolder(row);
    const hasPhotos = !!folder && folder.photos.length > 0;

    if (decision.kind === "no" && /publicar/i.test(decision.reason)) markedNo++;
    if (decision.kind === "desconocido" && (row.etapa ?? "").trim().toLowerCase() === "activa") unmarked++;

    // Family garages go only as an extra of the building's units.
    if (decision.kind === "publicar" && isStandaloneGarage(row)) {
      garages.push(label);
      skipped++;
      continue;
    }
    if (decision.kind !== "publicar" && !folder) {
      // Nothing on disk and not asked for: not a unit for the site (yet).
      skipped++;
      continue;
    }
    if (decision.kind !== "publicar" && folder) {
      folderNotPublish.push({ label, reason: decision.reason });
    }

    // "Sí" means "to publish, to prepare", not "ready": without photos a unit
    // is not loaded, not even as a draft (PUBLICACION.md, 16-sep). One already
    // on the site is left exactly as it is.
    if (decision.kind === "publicar" && !hasPhotos) {
      const siteAddr = siteAddress(row.direccion, row.direccionReal, row.unidad);
      const found = await findSite(sb, siteAddr);
      if (found.rows.length > 0) {
        for (const r of found.rows) if (r.address) seenAddresses.add(r.address);
        if (!folder) {
          onSiteNoFolder.push({ label, address: found.rows.map((r) => r.address).join(", ") });
          skipped++;
          continue;
        }
      } else {
        const why = !row.unidad
          ? "sin unidad (propiedad entera): PUBLICACION.md no dice dónde va su Publicación/"
          : folder
            ? "Publicación/ sin fotos"
            : `falta ${join(relative(ROOT, buildingDir(row)), "Publicación", unitFolderName(row.unidad), "fotos")}`;
        missingMaterial.push({ label, why });
        skipped++;
        continue;
      }
    }
    if (!folder) {
      skipped++;
      continue;
    }

    console.log(`\n── ${label}`);
    if (!row.unidad) {
      console.log("   ⏭ sin unidad, no se sincroniza");
      skipped++;
      continue;
    }
    console.log(`   maestra   : ${row.tipo ?? "—"} · etapa ${row.etapa ?? "—"} · ${row.situacion ?? "—"}`);
    console.log(`               precio pretendido ${money(row.precioPretendido, "USD")}${row.precioOferta ? ` · oferta ${money(row.precioOferta, "USD")}` : ""} · cochera ${row.cochera ?? "—"}${row.tipoCochera ? ` (${row.tipoCochera})` : ""}`);
    console.log(`   carpeta   : ${relative(ROOT, folder.dir)} · ${folder.photos.length} fotos${folder.ignored.length ? ` (ignoradas: ${folder.ignored.join(", ")})` : ""}${folder.provisorio ? " · provisorio.json" : ""}`);
    if (folder.provisorioError) {
      console.log(`   ✗ ${folder.provisorioError}`);
      failed++;
      continue;
    }

    const partida = findPartida(maestra.partidas, row.direccion, row.unidad);
    const built = buildFicha({ row, columns: maestra.columns, partida, provisorio: folder.provisorio, photos: folder.photos });
    const f = built.ficha;
    const warnings = [...built.warnings];
    if (decision.kind === "publicar" && decision.note) warnings.push(decision.note);

    // What the site has for this address.
    const found = await findSite(sb, String(f.address));
    const existing = found.rows;
    for (const r of existing) if (r.address) seenAddresses.add(r.address);
    seenAddresses.add(String(f.address));
    if (found.byLocality && existing.length === 1) {
      // Same listing, spelled with its locality on the site: keep the site's
      // address (there is no locality column to move "Banfield" into).
      warnings.push(`address: el sitio la tiene como "${existing[0].address}"; es la misma publicación y no se renombra.`);
      delete f.address;
      delete built.origen.address;
    }
    if (existing.length > 1) {
      console.log(`   ✗ hay ${existing.length} propiedades propias con esa dirección en el sitio; resolvelo en /admin antes.`);
      failed++;
      continue;
    }
    const site = existing[0] ? await readSiteRow(sb, existing[0].id) : null;

    if (!site && !hasPhotos) {
      console.log("   ⏭ falta material: no está en el sitio y Publicación/ no tiene fotos; no se crea ni como borrador");
      if (decision.kind === "publicar") missingMaterial.push({ label, why: "Publicación/ sin fotos" });
      skipped++;
      continue;
    }

    // A building's mother partida never overwrites a unit's own partida that
    // the site already has (Alsina 1639 4°Y: 063-252296 vs the lot's 063-069832).
    if (
      site &&
      built.origen.partida === "partidas" &&
      partida?.via === "madre" &&
      typeof site.partida === "string" &&
      normalizePartida(site.partida) !== normalizePartida(String(f.partida))
    ) {
      warnings.push(`partida: el sitio tiene la de la unidad (${site.partida}); no se pisa con la madre (${f.partida}).`);
      delete f.partida;
      delete built.origen.partida;
    }

    // The loader's own strictness is the last word on the JSON.
    const parsed = parseImportPayload({ ...f, photos: folder.photos });
    const errors = [...built.errors, ...parsed.errors];
    warnings.push(
      ...parsed.warnings.filter((w) => !w.startsWith("Sin fotos") && !(w.startsWith("Sin partida") && site?.partida)),
    );

    const extrasText = Array.isArray(f.extras) && f.extras.length
      ? ` · extras ${(f.extras as { kind: string; mode: string; detail?: string | null; price_delta?: number | null }[])
          .map((e) => `${e.kind} ${e.mode}${e.detail ? ` (${e.detail})` : ""}${e.price_delta ? ` +${e.price_delta}` : ""}`)
          .join(", ")}`
      : "";
    console.log(
      `   ficha     : ${f.address ?? existing[0]?.address} · ${f.property_type ?? "?"} en ${f.operation_type} · ${money(f.price_amount, f.price_currency)}` +
        ` · ${f.surface_covered ?? "?"}/${f.surface_total ?? "?"} m² · ${f.rooms ?? "?"} amb` +
        `${Array.isArray(f.tags) && f.tags.length ? ` · etiquetas ${(f.tags as string[]).join(", ")}` : ""}` +
        extrasText +
        `${isThirdParty(row) ? " · de terceros (agency)" : ""}`,
    );
    const byOrigin = new Map<string, string[]>();
    for (const [k, o] of Object.entries(built.origen)) byOrigin.set(o, [...(byOrigin.get(o) ?? []), k]);
    console.log(`   origen    : ${[...byOrigin.entries()].map(([o, ks]) => `${o} ← ${ks.join(", ")}`).join(" · ")}`);

    let priceBlocked = false;
    let photosBlocked = false;
    if (site) {
      const diffs = diffAgainstSite(f, site);
      const sitePhotos = Array.isArray(site.photos) ? site.photos.length : 0;
      console.log(`   sitio     : ya cargada ${site.id} · ${site.listing_status}${site.is_featured ? " · ★ destacada" : ""} · ${sitePhotos} fotos`);
      if (diffs.length === 0 && sitePhotos === folder.photos.length) {
        console.log("   vs sitio  : sin diferencias");
      }
      for (const d of diffs) {
        const gated = d.field === "price_amount" || d.field === "price_currency";
        if (gated && !PRECIOS) priceBlocked = true;
        console.log(`   vs sitio  : ${d.field}: ${fmt(d.site)} → ${fmt(d.ficha)}${gated && !PRECIOS ? "   ⛔ precio: se conserva el del sitio (usá --precios)" : ""}`);
      }
      if (sitePhotos !== folder.photos.length || (FOTOS && hasPhotos)) {
        if (!FOTOS || !hasPhotos) photosBlocked = true;
        const tail = !hasPhotos
          ? "   ⛔ Publicación/ vacía: la galería del sitio no se toca"
          : FOTOS
            ? "   → se reemplaza la galería"
            : "   ⛔ se conserva la galería (usá --fotos)";
        console.log(`   vs sitio  : fotos: ${sitePhotos} en el sitio, ${folder.photos.length} en Publicación/${tail}`);
      }
    } else {
      console.log(`   sitio     : no existe, se crearía como borrador${isThirdParty(row) ? " (source agency)" : ""}`);
    }

    let target: TargetStatus | null;
    if (decision.kind === "publicar") target = "publicada";
    else if (decision.kind === "no") target = unpublishedStatus(row);
    else target = null;
    console.log(
      `   publicar  : ${decision.kind === "publicar" ? "sí" : decision.kind === "no" ? `no (${decision.reason})` : `desconocido (${decision.reason})`}` +
        ` → ${target ? `estado ${target}` : site ? `se conserva "${site.listing_status}"` : "queda en borrador"}`,
    );

    for (const w of warnings) console.log(`   ⚠ ${w}`);
    for (const e of errors) console.log(`   ✗ ${e}`);

    // ficha.json is portable: photos relative to the unit folder.
    const fichaJson = {
      ...f,
      photos: folder.photos.map((p) => relative(folder.dir, p).split(sep).join("/")),
    };
    if (JSON_OUT) console.log(JSON.stringify(fichaJson, null, 2).replace(/^/gm, "   │ "));

    if (errors.length > 0) {
      failed++;
      continue;
    }
    if (decision.kind === "publicar") ready.push(label);
    if (!APLICAR) {
      ok++;
      continue;
    }

    // ── Apply ──
    await writeFile(join(folder.dir, "ficha.json"), JSON.stringify(fichaJson, null, 2) + "\n", "utf8");
    console.log(`   ✓ escrita ${relative(ROOT, join(folder.dir, "ficha.json"))}`);
    try {
      const result = await loadProperty(sb, parsed.payload!, {
        existingId: site ? String(site.id) : null,
        status: target,
        updatePrice: !site || PRECIOS,
        replacePhotos: FOTOS && hasPhotos,
        statedKeys: Object.keys(f),
        source: isThirdParty(row) ? "agency" : "owner_direct",
        log: (line) => console.log(`   ${line}`),
      });
      if (priceBlocked) console.log("   ⛔ precio no actualizado (falta --precios)");
      if (photosBlocked) console.log("   ⛔ galería no reemplazada");
      const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      console.log(`   → ${base}/p/${result.id}`);
      ok++;
    } catch (err) {
      console.log(`   ✗ ${err instanceof Error ? err.message : err}`);
      failed++;
    }
  }

  // ── Summary: the sheet's intent vs the disk vs the site ──
  console.log("\n=== Resumen ===");
  console.log(`Publicar = Sí con material, listas: ${ready.length}`);
  for (const l of ready) console.log(`   ✓ ${l}`);
  console.log(`Publicar = Sí, falta material (no se cargan): ${missingMaterial.length}`);
  for (const m of missingMaterial) console.log(`   ✗ ${m.label} — ${m.why}`);
  if (garages.length) {
    console.log(`Cocheras sueltas en Sí (van sólo como extra, no se cargan): ${garages.length}`);
    for (const g of garages) console.log(`   · ${g}`);
  }
  if (onSiteNoFolder.length) {
    console.log(`Publicar = Sí, ya en el sitio y sin Publicación/ (no se tocan): ${onSiteNoFolder.length}`);
    for (const o of onSiteNoFolder) console.log(`   · ${o.label} — en el sitio como "${o.address}"`);
  }
  if (folderNotPublish.length) {
    console.log(`Con Publicación/ pero sin Publicar = Sí: ${folderNotPublish.length}`);
    for (const x of folderNotPublish) console.log(`   · ${x.label} — ${x.reason}`);
  }
  console.log(`Publicar = No: ${markedNo} · Activas sin marcar: ${unmarked}`);

  // Only meaningful over the whole sheet: with a filter, every listing outside
  // it would show up here as "missing from the maestra", which it is not.
  if (FILTER_DIRECCION || FILTER_UNIDAD) {
    console.log("En el sitio y no en la maestra: (se omite con --direccion / --unidad)");
    console.log(`\n${ok} ok · ${skipped} salteadas · ${failed} con errores${APLICAR ? "" : " — modo prueba, no se escribió nada"}\n`);
    if (failed > 0) process.exit(1);
    return;
  }

  const { data: siteRows, error: siteErr } = await sb
    .from("properties")
    .select("id, address, listing_status")
    .in("source", ["owner_direct", "agency"])
    .order("address");
  if (siteErr) {
    console.log(`En el sitio y no en la maestra: no pude leer el sitio (${siteErr.message})`);
  } else {
    const orphans = (siteRows as { id: string; address: string | null; listing_status: string | null }[]).filter(
      (r) => !r.address || !seenAddresses.has(r.address),
    );
    console.log(`En el sitio y no en este recorrido de la maestra: ${orphans.length}`);
    for (const o of orphans) console.log(`   · ${o.address ?? "(sin dirección)"} — ${o.listing_status} · ${o.id}`);
  }

  console.log(`\n${ok} ok · ${skipped} salteadas · ${failed} con errores${APLICAR ? "" : " — modo prueba, no se escribió nada"}\n`);
  if (APLICAR && ok > 0) {
    console.log("  La caché pública del header y de los pins se renueva sola en ≤5 minutos.\n");
  }
  if (failed > 0) process.exit(1);
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
