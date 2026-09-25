/**
 * sincronizar-colegas — a partner's catalog, read from their site and kept in
 * step with it (source = 'colega', lib/colegas).
 *
 *   npm run sincronizar-colegas                 # dry run: reads, compares, writes nothing
 *   npm run sincronizar-colegas -- --aplicar    # inserts, updates and takes down
 *   npm run sincronizar-colegas -- --colega laudani
 *
 * What it does, per partner:
 *   1. Reads how many of their listings are published now (the baseline).
 *   2. Walks the listing to the empty page past the end.
 *   3. Reads each property page and normalizes it (lib/colegas/platforms picks
 *      the reader for the partner's platform).
 *   4. Inserts what is new, updates what changed, re-publishes what came back.
 *      A listing their site keeps with a "Vendido" ribbon is written as
 *      `vendida`: seen, so not gone, and not for sale.
 *   5. Takes down (listing_status = 'borrador') what is no longer on their
 *      site — only when the walk reached the end AND saw at least half the
 *      baseline. That is decideDeactivation, the guard that exists because
 *      this repo's scrapers wiped the market catalog three times. A partner's
 *      listing that disappeared by mistake is a published property gone from
 *      Tomy's site, which is worse.
 *
 * A listing whose page fails to load, or that cannot be normalized (an
 * unknown type or place), is left exactly as it is: it was seen in the list,
 * so it is not "gone", and it is not rewritten with a guess.
 *
 * Plain HTTP with a pause between requests: the partner's site is small and
 * it is a friend's.
 */
import dotenv from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { COLEGAS, type Colega } from "../lib/colegas";
import type { ColegaRow } from "../lib/colegas/buscadorprop";
import { readerFor, type ListingEntry } from "../lib/colegas/platforms";
import { decideDeactivation, type CrawlEnd } from "../lib/services/scrapers/crawl-completeness";
import { lookupParcel } from "../lib/services/arba";
import { groupPartnerUnits, type BuildingAssignment, type PartnerUnit } from "../lib/colegas/buildings";
import { LOCALIDADES } from "../lib/zona-sur/localidades";

dotenv.config({ path: ".env.local", quiet: true });

const args = process.argv.slice(2);
const APLICAR = args.includes("--aplicar");
const ONLY = (() => {
  const i = args.indexOf("--colega");
  return i >= 0 ? args[i + 1] : null;
})();
const MAX_PAGES = 40;
const PAUSE_MS = 700;
const USER_AGENT = "Mozilla/5.0 (compatible; JotaemeSync/1.0)";

function fail(msg: string): never {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

function admin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) fail("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  return createClient(url, key, { auth: { persistSession: false } });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get(url: string, json = false): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      ...(json ? { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" } : {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res.text();
}

/** Walks the listing, page by page, until a page comes back empty. */
async function crawlEntries(colega: Colega): Promise<{ entries: ListingEntry[]; end: CrawlEnd }> {
  const reader = readerFor(colega);
  const entries: ListingEntry[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    let body: string;
    try {
      body = await get(reader.listingUrl(colega, page), reader.listingIsJson);
    } catch (err) {
      console.warn(`  ⚠ página ${page}: ${err instanceof Error ? err.message : err}`);
      return { entries, end: "page_error" };
    }
    const found = reader.entries(body, colega);
    if (found.length === 0) return { entries, end: "exhausted" };
    for (const e of found) if (!entries.some((x) => x.id === e.id)) entries.push(e);
    await sleep(PAUSE_MS);
  }
  return { entries, end: "page_cap" };
}

const COMPARED: (keyof ColegaRow)[] = [
  "address", "nomenclatura_catastral", "localidad", "partido", "property_type", "operation_type", "price_amount", "price_currency",
  "rooms", "bedrooms", "bathrooms", "garages", "surface_covered", "surface_total", "year_built",
  "description", "photos", "lat", "lng", "tags",
];

type SiteRow = Record<string, unknown> & { id: string; external_id: string; listing_status: string | null };

function same(a: unknown, b: unknown): boolean {
  const norm = (v: unknown) => (v === undefined || v === "" ? null : typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v);
  return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
}

async function syncColega(sb: SupabaseClient, colega: Colega) {
  console.log(`\n── ${colega.name} (${colega.key}) · ${colega.siteUrl}`);

  // 1. Baseline, before anything is touched. Null means "could not read",
  //    and the guard refuses on null rather than reading it as zero.
  let baseline: number | null = null;
  {
    const { count, error } = await sb
      .from("properties")
      .select("id", { count: "exact", head: true })
      .eq("source", "colega")
      .eq("partner", colega.key)
      .eq("listing_status", "publicada");
    if (!error && typeof count === "number") baseline = count;
  }

  // 2. The listing.
  const reader = readerFor(colega);
  const { entries, end } = await crawlEntries(colega);
  const ids = entries.map((e) => e.id);
  console.log(`  listado  : ${ids.length} propiedades · fin: ${end} · publicadas hoy: ${baseline ?? "no se pudo leer"}`);

  // 3. Each property.
  const rows = new Map<string, ColegaRow>();
  const urls = new Map<string, string>();
  const sold = new Set<string>();
  const unreadable: string[] = [];
  const rejected: string[] = [];
  for (const { id, url, sold: soldOnCard } of entries) {
    try {
      const html = await get(url);
      const n = reader.read(html, id, colega, LOCALIDADES);
      if (n.row) {
        rows.set(id, n.row);
        urls.set(id, url);
        if (n.sold || soldOnCard) sold.add(id);
      } else rejected.push(`${id}: ${n.errors.join("; ")}`);
      for (const w of n.warnings) console.log(`  ⚠ ${id}: ${w}`);
    } catch (err) {
      unreadable.push(`${id}: ${err instanceof Error ? err.message : err}`);
    }
    await sleep(PAUSE_MS);
  }

  // 3b. Buildings. Each pin is placed on a parcel (cached for 180 days in
  //     arba_lookups, so a daily run asks almost nothing), and the units of
  //     one building get one parcel and one address (lib/colegas/buildings).
  //     If the cadastre fails, grouping is left exactly as it is this run.
  //     A partner outside the province of Buenos Aires gets no grouping: the
  //     cadastre does not know its ground (Colega.cadastre).
  let grouping: Map<string, BuildingAssignment> | null = null;
  if (colega.cadastre) try {
    const units: PartnerUnit[] = [];
    for (const [id, row] of rows) {
      const parcel = row.lat !== null && row.lng !== null ? await lookupParcel(row.lat, row.lng) : null;
      units.push({
        externalId: id,
        address: row.address,
        parcel: parcel ? { nomenclatura: parcel.nomenclatura, inside: parcel.matchStrategy === "intersects" } : null,
      });
      if (parcel?.source !== "cache") await sleep(250);
    }
    grouping = groupPartnerUnits(units);
    for (const [id, row] of rows) {
      const g = grouping.get(id);
      if (!g) continue;
      row.nomenclatura_catastral = g.nomenclatura;
      row.address = g.address;
    }
    const sizes = [...new Set([...grouping.values()].filter((g) => g.size > 1 && g.nomenclatura).map((g) => g.nomenclatura))];
    console.log(`  edificios: ${sizes.length} con más de una unidad`);
  } catch (err) {
    console.warn(`  ⚠ catastro no disponible, el agrupado queda como está: ${err instanceof Error ? err.message : err}`);
  }

  // 4. Against the site.
  const { data: existing, error } = await sb
    .from("properties")
    .select(`id, external_id, listing_status, ${COMPARED.join(", ")}`)
    .eq("source", "colega")
    .eq("partner", colega.key);
  if (error) fail(`No pude leer las propiedades del colega: ${error.message}`);
  const byExternal = new Map((existing as unknown as SiteRow[]).map((r) => [r.external_id, r]));

  const inserts: ColegaRow[] = [];
  const updates: { id: string; externalId: string; patch: Record<string, unknown>; fields: string[] }[] = [];
  for (const [id, row] of rows) {
    const site = byExternal.get(id);
    if (!site) {
      inserts.push(row);
      continue;
    }
    if (!grouping) {
      // Without the cadastre this run, keep the building the site already has.
      row.address = (site.address as string | null) ?? row.address;
      row.nomenclatura_catastral = (site.nomenclatura_catastral as string | null) ?? null;
    }
    const fields = COMPARED.filter((k) => !same(site[k], row[k]));
    const status = sold.has(id) ? "vendida" : "publicada";
    const restatus = site.listing_status !== status;
    if (fields.length || restatus) {
      const patch: Record<string, unknown> = Object.fromEntries(fields.map((k) => [k, row[k]]));
      if (restatus) Object.assign(patch, { listing_status: status, is_active: status === "publicada" });
      const note = status === "vendida" ? "vendida" : "re-publicada";
      updates.push({ id: site.id, externalId: id, patch, fields: restatus ? [...fields, note] : fields });
    }
  }

  const seen = new Set(ids);
  const gone = (existing as unknown as SiteRow[]).filter(
    (r) => r.listing_status === "publicada" && !seen.has(r.external_id),
  );
  const decision = decideDeactivation(end, ids.length, baseline);

  console.log(`  nuevas   : ${inserts.length}${sold.size ? ` · vendidas en su sitio: ${sold.size}` : ""}`);
  console.log(`  cambios  : ${updates.length}${updates.length ? " — " + updates.slice(0, 8).map((u) => `${u.externalId} (${u.fields.join(", ")})`).join(" · ") : ""}`);
  console.log(`  a bajar  : ${gone.length}${gone.length ? (decision.allowed ? "" : ` — NO se bajan: ${decision.reason}`) : ""}`);
  if (rejected.length) console.log(`  sin publicar (no se pudieron traducir): ${rejected.length}\n    ${rejected.join("\n    ")}`);
  if (unreadable.length) console.log(`  sin leer (se dejan como están): ${unreadable.length}\n    ${unreadable.join("\n    ")}`);

  if (!APLICAR) return;

  // 5. Writes.
  const now = new Date().toISOString();
  for (const row of inserts) {
    const forSale = !sold.has(row.external_id);
    const { error: e } = await sb.from("properties").insert({
      ...row,
      source: "colega",
      partner: colega.key,
      url: urls.get(row.external_id) ?? null,
      listing_status: forSale ? "publicada" : "vendida",
      is_active: forSale,
      first_seen_at: now,
      last_seen_at: now,
    });
    if (e) console.error(`  ✗ alta ${row.external_id}: ${e.message}`);
  }
  for (const u of updates) {
    const { error: e } = await sb.from("properties").update({ ...u.patch, last_seen_at: now }).eq("id", u.id);
    if (e) console.error(`  ✗ cambio ${u.externalId}: ${e.message}`);
  }
  // Seen and unchanged still count as seen.
  const unchanged = [...rows.keys()].filter((id) => byExternal.has(id) && !updates.some((u) => u.externalId === id));
  if (unchanged.length) {
    await sb
      .from("properties")
      .update({ last_seen_at: now })
      .eq("source", "colega")
      .eq("partner", colega.key)
      .in("external_id", unchanged);
  }
  if (gone.length && decision.allowed) {
    const { error: e } = await sb
      .from("properties")
      .update({ listing_status: "borrador", is_active: false })
      .in("id", gone.map((r) => r.id));
    if (e) console.error(`  ✗ bajas: ${e.message}`);
  }
  console.log(`  ✓ aplicado`);
}

async function main() {
  const targets = Object.values(COLEGAS).filter((c) => !ONLY || c.key === ONLY);
  if (targets.length === 0) fail(`No hay un colega "${ONLY}". Conocidos: ${Object.keys(COLEGAS).join(", ")}`);
  console.log(`Modo: ${APLICAR ? "APLICAR" : "prueba (no escribe nada)"}`);
  const sb = admin();
  for (const c of targets) await syncColega(sb, c);
  if (APLICAR) console.log("\nLa caché pública del catálogo se renueva sola en ≤5 minutos.");
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
