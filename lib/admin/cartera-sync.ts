import { PROPERTY_TAGS, isPropertyTag, tagLabel, type PropertyTag } from "@/lib/property/tags";
import { EXTRA_KINDS, type ExtraKind, type ExtraMode } from "@/lib/property/extras";
import { PROPERTY_TYPES, type PropertyType } from "@/lib/property/types";
import { normalizePartida } from "@/lib/zona-sur/partidos";

/**
 * The pure half of `scripts/sincronizar-cartera.ts` — the bridge between
 * Tomy's property folder (PLANILLA MAESTRA + Publicación/) and the loader.
 *
 * The contract is `PUBLICACION.md` in the Inmobiliaria folder: the maestra
 * is the source of truth, `ficha.json` is DERIVED from it, and the folder
 * names follow the maestra's own spelling. Everything here is decidable
 * without touching a file or the network, so it can be tested: what a unit
 * folder is called, what the site address is, what the loader's JSON
 * should say, and how that compares with what the site already has.
 *
 * Two rules from this repo's history are load-bearing:
 *   - A value that means "I could not read it" is never quietly the
 *     permissive case. Unknown → reported as unknown.
 *   - Every field in the ficha says where it came from (`origen`), because
 *     a plausible number with no provenance is exactly how this project's
 *     worst bugs looked.
 */

// ─── Maestra rows ────────────────────────────────────────────────────────────

/** One row of the `Unidades` sheet, with the columns the loader cares about. */
export interface UnidadRow {
  direccion: string;
  unidad: string | null;
  tipo: string | null;
  cochera: string | null;
  tipoCochera: string | null;
  etapa: string | null;
  situacion: string | null;
  precioPretendido: number | null;
  /**
   * A temporary offer price. When set it is what the site publishes and the
   * `oferta` tag goes on; `precioPretendido` stays the list price. Lets the
   * maestra keep both numbers without the sync fighting the offer every run.
   */
  precioOferta: number | null;
  carpetaEnDisco: string | null;
  /** Columns PUBLICACION.md lists as "a agregar" — absent until Cowork adds them. */
  publicar: string | null;
  tituloWeb: string | null;
  descripcionWeb: string | null;
  m2Cubiertos: number | null;
  m2Totales: number | null;
  ambientes: number | null;
  dormitorios: number | null;
  banos: number | null;
  anioConstruccion: number | null;
  etiquetas: string | null;
  operacion: string | null;
  direccionReal: string | null;
}

/** Which of the optional columns the sheet actually has. */
export interface MaestraColumns {
  publicar: boolean;
  direccionReal: boolean;
  operacion: boolean;
}

/** One row of the free-form `Partidas` sheet. */
export interface PartidaRow {
  /** 9-digit key, or null when the cell could not be read as a partida. */
  partida: string | null;
  partidaRaw: string;
  partido: string | null;
  direccion: string | null;
  /** "partida madre", a unit label, or whatever the sheet says. */
  alcance: string | null;
  notas: string | null;
}

/**
 * Hand-written values for what the maestra does not carry yet
 * (`Publicación/<Unidad>/provisorio.json`). Same keys as the loader's JSON.
 * A maestra column, once it exists, wins over this file — and the report
 * says so, so the entry can be deleted.
 */
export type Provisorio = Record<string, unknown>;

// ─── Names ───────────────────────────────────────────────────────────────────

/**
 * Normalizes a unit label the way PUBLICACION.md rule 2 spells folders:
 * `1°C` → `1C`, `U.F: 9` → `UF 9`, `U.C: A — espacio C` → `UC A - espacio C`.
 * Tolerates the sheet's own typos (`U:F 1`, `U.F:1`).
 */
export function unitFolderName(unidad: string): string {
  return normalizeUnit(unidad, { keepDegree: false });
}

/**
 * The unit as it reads inside the site address: `1°A` keeps its degree
 * sign (that is how the four Belgrano rows are already keyed), `U.F: 9`
 * becomes `UF 9`.
 */
export function unitSiteLabel(unidad: string): string {
  return normalizeUnit(unidad, { keepDegree: true });
}

function normalizeUnit(unidad: string, opts: { keepDegree: boolean }): string {
  let s = unidad.trim();
  s = s.replace(/[—–]/g, "-");
  if (!opts.keepDegree) s = s.replace(/[°º]/g, "");
  s = s.replace(/U[.:]?\s?F[.:]?\s?/i, "UF ");
  s = s.replace(/U[.:]?\s?C[.:]?\s?/i, "UC ");
  s = s.replace(/:/g, "");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/**
 * The address the site shows and the key an existing row is found by.
 * `direccionReal` (a maestra column) beats the folder name: the folder is
 * `Vergara y Cabrera`, the ficha says the street number.
 */
export function siteAddress(direccion: string, direccionReal: string | null, unidad: string | null): string {
  const base = (direccionReal ?? direccion).trim();
  if (!unidad || unidad.trim() === "") return base;
  return `${base} ${unitSiteLabel(unidad)}`;
}

// ─── Reading the "Tipo" free text ───────────────────────────────────────────

export interface TipoParse {
  propertyType: PropertyType | null;
  surfaceCovered: number | null;
  surfaceTotal: number | null;
  rooms: number | null;
  /** Extras the text names with a size: "terraza 40 m²", "patio 22 m²". */
  extras: { kind: ExtraKind; detail: string }[];
}

const WORD_NUMBERS: Record<string, number> = {
  un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6,
};

/**
 * What the maestra's `Tipo` column ("2 ambientes con terraza propia (40 m²
 * + terraza 40 m²)") lets us derive. Everything here is a DERIVATION and is
 * reported as such; an explicit maestra column or a provisorio value beats
 * it. Returns null for anything the text does not state — never a guess.
 */
export function parseTipo(tipo: string | null): TipoParse {
  const out: TipoParse = { propertyType: null, surfaceCovered: null, surfaceTotal: null, rooms: null, extras: [] };
  if (!tipo) return out;
  const t = tipo.toLowerCase();

  if (/\bph\b/.test(t)) out.propertyType = "ph";
  else if (/cochera/.test(t) && !/ambiente|loft|casa|depto|departamento/.test(t)) out.propertyType = "cochera";
  else if (/local/.test(t)) out.propertyType = "local";
  else if (/terreno|lote|bald/.test(t)) out.propertyType = "lote";
  else if (/casa/.test(t)) out.propertyType = "casa";
  else if (/loft|ambiente|depto|departamento|d[úu]plex/.test(t)) out.propertyType = "departamento";

  // Surfaces: every "<n> m²" in the text. One figure is the whole unit; two
  // or more read as covered + expansions, so covered = first, total = sum.
  const sizes = [...t.matchAll(/(\d+(?:[.,]\d+)?)\s*m[²2]/g)].map((m) => Number(m[1].replace(",", ".")));
  if (sizes.length === 1) {
    out.surfaceCovered = sizes[0];
    out.surfaceTotal = sizes[0];
  } else if (sizes.length > 1) {
    out.surfaceCovered = sizes[0];
    out.surfaceTotal = sizes.reduce((a, b) => a + b, 0);
  }

  if (/monoambiente/.test(t)) out.rooms = 1;
  else {
    const m = t.match(/(\d+|un|uno|una|dos|tres|cuatro|cinco|seis)\s+ambientes?/);
    if (m) out.rooms = /^\d+$/.test(m[1]) ? Number(m[1]) : (WORD_NUMBERS[m[1]] ?? null);
  }

  for (const kind of EXTRA_KINDS) {
    if (kind === "cochera") continue; // the Cochera column is authoritative for that one
    const m = t.match(new RegExp(`${kind}[^\\d(]*?(\\d+(?:[.,]\\d+)?)\\s*m[²2]`));
    if (m) out.extras.push({ kind, detail: `${m[1]} m²` });
    else if (new RegExp(`\\b${kind}\\b`).test(t)) out.extras.push({ kind, detail: "" });
  }
  return out;
}

/**
 * The `Cochera` + `Tipo cochera` columns as an extra, or null when there is none.
 *
 * The column is free text, and since 16-sep it follows two shapes Cowork
 * agreed with Tomy: "Opcional (+USD 5.000)" — the surcharge is read into
 * `priceDelta` — and "Incluida: ½ U.C B espacio C" — what follows the colon
 * is the detail, in its original case. Older values ("00-15", "opcional")
 * still read as before.
 */
export function cocheraFromColumns(
  cochera: string | null,
  tipoCochera: string | null,
): { mode: ExtraMode; detail: string | null; priceDelta: number | null } | null {
  const raw = (cochera ?? "").trim();
  const c = raw.toLowerCase();
  if (c === "" || c === "no" || c === "-" || c === "—") return null;
  const mode: ExtraMode = /opcional/.test(c) ? "opcional" : "incluida";

  let priceDelta: number | null = null;
  const money = raw.match(/\+\s*(?:USD|U\$S|US\$)?\s*([\d.]+)/i);
  if (mode === "opcional" && money) {
    const n = Number(money[1].replace(/\./g, ""));
    if (Number.isFinite(n) && n > 0) priceDelta = n;
  }

  const detailParts: string[] = [];
  if (mode === "incluida") {
    const afterColon = raw.match(/^incluida\s*:\s*(.+)$/i);
    if (afterColon) detailParts.push(afterColon[1].trim());
    else if (!/^(s[ií]|incluida)$/.test(c)) detailParts.push(raw);
  }
  if (tipoCochera && tipoCochera.trim() !== "" && !/integrada/i.test(tipoCochera)) {
    detailParts.push(tipoCochera.trim().toLowerCase());
  }
  const detail = detailParts.length ? [...new Set(detailParts)].join(", ") : null;
  return { mode, detail, priceDelta };
}

/**
 * Whether two addresses name the same listing, ignoring a trailing
 * locality: the site has "Talcahuano 258, Banfield", the maestra
 * "Talcahuano 258" (Banfield is the locality, not part of the address).
 * Case, accents and spacing are ignored; the unit, if any, still has to match.
 */
export function sameListingAddress(a: string, b: string): boolean {
  const norm = (s: string) =>
    s
      .split(",")[0]
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  return norm(a) !== "" && norm(a) === norm(b);
}

// ─── Publish decision ───────────────────────────────────────────────────────

export type PublishDecision =
  | { kind: "publicar"; note?: string }
  | { kind: "no"; reason: string }
  | { kind: "desconocido"; reason: string };

/**
 * Whether the maestra says this unit goes on the site.
 *
 * `Publicar` is Tomy's explicit, per-unit decision and wins over `Etapa`:
 * a third party's unit (Belgrano 1287 PB A, sold to Santanna and now resold
 * through the agency) is "En transición" in the family's books and still
 * "Sí" to publish. The mismatch is reported, not silently resolved.
 *
 * A missing column or an empty cell is UNKNOWN, not "no" and not "yes": the
 * column arrived with 128 blank rows, and reading blank as "no" would take
 * the four published units down on the first real run. Only a written "No"
 * (or a non-Activa row nobody marked Sí) says no.
 */
export function publishDecision(row: UnidadRow, columns: MaestraColumns): PublishDecision {
  const etapa = (row.etapa ?? "").trim().toLowerCase();
  const p = columns.publicar ? (row.publicar ?? "").trim().toLowerCase() : "";
  const yes = ["sí", "si", "s", "x", "yes", "true", "1"].includes(p);

  if (yes) {
    return etapa === "activa"
      ? { kind: "publicar" }
      : { kind: "publicar", note: `Etapa "${row.etapa ?? "(vacía)"}", pero Publicar = Sí manda` };
  }
  if (etapa !== "activa") {
    return { kind: "no", reason: `Etapa "${row.etapa ?? "(vacía)"}", sólo se publica "Activa"` };
  }
  if (!columns.publicar) {
    return { kind: "desconocido", reason: 'la maestra todavía no tiene la columna "Publicar"' };
  }
  if (p === "") return { kind: "desconocido", reason: "Publicar está vacío" };
  return { kind: "no", reason: `Publicar = "${row.publicar}"` };
}

/**
 * A garage (or garage + storage) row sold on its own. The family's garages
 * are offered only as an extra of the units in the same building (Tomy,
 * 16-sep-2026), so the sync never loads one of these as a listing — even
 * marked Sí, it is reported and skipped.
 */
export function isStandaloneGarage(row: UnidadRow): boolean {
  return parseTipo(row.tipo).propertyType === "cochera";
}

/**
 * Third parties' units live under `Propiedades/Terceros/` and load as
 * `source: 'agency'`: the agency sells them, the family does not own them.
 */
export function isThirdParty(row: UnidadRow): boolean {
  return /(^|[\\/])Terceros([\\/]|$)/i.test(row.carpetaEnDisco ?? "");
}

/** The `listing_status` a unit that is NOT to be published should end up in. */
export function unpublishedStatus(row: UnidadRow): "vendida" | "borrador" {
  const s = `${row.etapa ?? ""} ${row.situacion ?? ""}`.toLowerCase();
  return /vendid|escriturad|permuta|cobrad/.test(s) ? "vendida" : "borrador";
}

// ─── Partidas ───────────────────────────────────────────────────────────────

/**
 * The partida for a unit: its own row in the `Partidas` sheet if there is
 * one, else the building's "partida madre". Belgrano 1287 has no PH yet, so
 * all seven units tax under the mother partida — which is what the four
 * published rows already carry.
 */
export function findPartida(
  rows: readonly PartidaRow[],
  direccion: string,
  unidad: string | null,
): { row: PartidaRow; via: "unidad" | "madre" } | null {
  const mine = rows.filter((r) => (r.direccion ?? "").trim().toLowerCase() === direccion.trim().toLowerCase());
  if (mine.length === 0) return null;
  if (unidad) {
    const label = unitSiteLabel(unidad).toLowerCase();
    const own = mine.find((r) => r.alcance && unitSiteLabel(r.alcance).toLowerCase() === label);
    if (own) return { row: own, via: "unidad" };
  }
  const madre = mine.find((r) => /madre/i.test(r.alcance ?? ""));
  if (madre) return { row: madre, via: "madre" };
  return mine.length === 1 ? { row: mine[0], via: "madre" } : null;
}

/** Reads a partida cell like "063-047850 (falta el dígito verificador)". */
export function partidaFromCell(cell: string): string | null {
  const head = cell.split("(")[0].trim();
  return normalizePartida(head);
}

// ─── Tags ───────────────────────────────────────────────────────────────────

/**
 * "Oferta, A estrenar" → ["oferta", "a_estrenar"]. Accepts labels or keys.
 * Anything else is returned under `unknown` so the caller can refuse it —
 * the same rule the loader applies to its JSON.
 */
export function parseEtiquetas(cell: string | null): { tags: PropertyTag[]; unknown: string[] } {
  if (!cell || cell.trim() === "") return { tags: [], unknown: [] };
  const byLabel = new Map(PROPERTY_TAGS.map((t) => [tagLabel(t).toLowerCase(), t] as const));
  const tags: PropertyTag[] = [];
  const unknown: string[] = [];
  for (const part of cell.split(/[,;·]/)) {
    const p = part.trim();
    if (p === "") continue;
    const key = p.toLowerCase().replace(/\s+/g, "_");
    if (isPropertyTag(key)) tags.push(key);
    else if (byLabel.has(p.toLowerCase())) tags.push(byLabel.get(p.toLowerCase())!);
    else unknown.push(p);
  }
  return { tags: [...new Set(tags)], unknown };
}

// ─── Building the ficha ─────────────────────────────────────────────────────

export type Origen = "maestra" | "provisorio" | "derivado" | "partidas" | "fotos" | "default";

export interface BuildInput {
  row: UnidadRow;
  columns: MaestraColumns;
  partida: { row: PartidaRow; via: "unidad" | "madre" } | null;
  provisorio: Provisorio | null;
  /** Absolute paths, already sorted — the gallery order. */
  photos: string[];
}

export interface BuiltFicha {
  /** The loader's JSON, ready for `parseImportPayload`. */
  ficha: Record<string, unknown>;
  origen: Record<string, Origen>;
  warnings: string[];
  errors: string[];
}

const PROVISORIO_KEYS = new Set([
  "address", "partido", "partida", "nomenclatura_catastral", "property_type", "operation_type",
  "price_amount", "price_currency", "surface_total", "surface_covered", "rooms", "bedrooms",
  "bathrooms", "garages", "year_built", "description", "tags", "extras", "is_featured",
]);

/**
 * Assembles the loader JSON for one unit. Precedence per field:
 * maestra column → provisorio.json → derived from the `Tipo` text → nothing.
 * Every field records its origin. The maestra never loses to the file: when
 * both have a value the file's is ignored and a warning names it, so the
 * hand-written copy gets deleted rather than drifting.
 */
export function buildFicha(input: BuildInput): BuiltFicha {
  const { row, columns, provisorio, photos } = input;
  const ficha: Record<string, unknown> = {};
  const origen: Record<string, Origen> = {};
  const warnings: string[] = [];
  const errors: string[] = [];
  const prov = provisorio ?? {};

  for (const k of Object.keys(prov)) {
    if (!PROVISORIO_KEYS.has(k)) errors.push(`provisorio.json: campo desconocido "${k}".`);
  }

  const set = (key: string, value: unknown, from: Origen) => {
    if (value === null || value === undefined || value === "") return false;
    ficha[key] = value;
    origen[key] = from;
    return true;
  };
  /** maestra → provisorio → derived, in that order; the first non-empty wins. */
  const pick = (key: string, maestra: unknown, derived: unknown = null) => {
    const hadProv = prov[key] !== undefined && prov[key] !== null && prov[key] !== "";
    if (set(key, maestra, "maestra")) {
      if (hadProv) warnings.push(`${key}: la maestra ya lo trae, se ignora provisorio.json.`);
      return;
    }
    if (hadProv) {
      set(key, prov[key], "provisorio");
      return;
    }
    set(key, derived, "derivado");
  };

  const tipo = parseTipo(row.tipo);

  set("address", siteAddress(row.direccion, row.direccionReal, row.unidad), columns.direccionReal ? "maestra" : "derivado");
  if (typeof prov.address === "string" && prov.address.trim() !== "") {
    ficha.address = prov.address.trim();
    origen.address = "provisorio";
  }
  if (!columns.direccionReal && origen.address === "derivado") {
    warnings.push('address: sale del nombre de carpeta, la maestra no tiene "Dirección real" todavía.');
  }

  pick("partido", null);
  if (!ficha.partido && input.partida?.row.partido) set("partido", input.partida.row.partido, "partidas");
  if (!ficha.partido) errors.push("partido: no está en la hoja Partidas ni en provisorio.json.");

  if (!set("partida", typeof prov.partida === "string" ? prov.partida : null, "provisorio")) {
    if (input.partida?.row.partida) {
      set("partida", input.partida.row.partida, "partidas");
      if (input.partida.via === "madre") {
        warnings.push("partida: es la partida madre del edificio, la unidad no tiene la suya en la hoja Partidas.");
      }
    } else {
      warnings.push("partida: sin dato, la ficha no se va a poder publicar.");
    }
  }
  set("nomenclatura_catastral", prov.nomenclatura_catastral, "provisorio");

  pick("property_type", null, tipo.propertyType);
  if (ficha.property_type && !(PROPERTY_TYPES as readonly string[]).includes(String(ficha.property_type))) {
    errors.push(`property_type: "${ficha.property_type}" no es un tipo válido (${PROPERTY_TYPES.join(", ")}).`);
  }
  if (!ficha.property_type) errors.push(`property_type: no se puede deducir de Tipo = "${row.tipo ?? ""}".`);

  const opMaestra = row.operacion ? row.operacion.trim().toLowerCase() : null;
  pick("operation_type", opMaestra);
  if (!ficha.operation_type) set("operation_type", "venta", "default");

  // An offer price beats the list price and carries its own tag: an offer
  // that nothing marks as an offer is just a lower number.
  const enOferta = row.precioOferta !== null && row.precioOferta > 0;
  pick("price_amount", enOferta ? row.precioOferta : row.precioPretendido);
  if (!ficha.price_amount) warnings.push("price_amount: sin precio pretendido, la ficha no se va a poder publicar.");
  pick("price_currency", null);
  if (!ficha.price_currency) set("price_currency", "USD", "default");

  pick("surface_covered", row.m2Cubiertos, tipo.surfaceCovered);
  pick("surface_total", row.m2Totales, tipo.surfaceTotal);
  pick("rooms", row.ambientes, tipo.rooms);
  pick("bedrooms", row.dormitorios);
  pick("bathrooms", row.banos);
  pick("garages", null);
  pick("year_built", row.anioConstruccion);
  pick("description", row.descripcionWeb);
  if (row.tituloWeb) warnings.push("Título web: la ficha no tiene título aparte de la dirección, se ignora por ahora.");

  // Tags: maestra column (if any) plus provisorio, unknown values are errors.
  const et = parseEtiquetas(row.etiquetas);
  for (const u of et.unknown) errors.push(`Etiquetas: "${u}" no es una etiqueta conocida (${PROPERTY_TAGS.join(", ")}).`);
  if (et.tags.length) set("tags", et.tags, "maestra");
  else if (Array.isArray(prov.tags) && prov.tags.length) set("tags", prov.tags, "provisorio");
  if (enOferta) {
    const current = (ficha.tags as string[] | undefined) ?? [];
    if (!current.includes("oferta")) set("tags", [...current, "oferta"], "maestra");
  }

  // Extras: the Cochera column decides the garage; terrace/patio come from
  // the Tipo text; provisorio.json can add the price delta or override all.
  const derivedExtras: Record<string, unknown>[] = [];
  const coch = cocheraFromColumns(row.cochera, row.tipoCochera);
  if (coch) derivedExtras.push({ kind: "cochera", mode: coch.mode, detail: coch.detail, price_delta: coch.priceDelta });
  for (const e of tipo.extras) {
    derivedExtras.push({ kind: e.kind, mode: "incluida", detail: e.detail || null, price_delta: null });
  }
  if (Array.isArray(prov.extras)) {
    // Merge by kind: a provisorio entry completes (or replaces) the derived one.
    const merged = new Map<string, Record<string, unknown>>();
    for (const e of derivedExtras) merged.set(String(e.kind), e);
    for (const e of prov.extras as Record<string, unknown>[]) {
      const prev = merged.get(String(e.kind)) ?? {};
      merged.set(String(e.kind), { ...prev, ...e });
    }
    set("extras", [...merged.values()], "provisorio");
  } else if (derivedExtras.length) {
    set("extras", derivedExtras, "derivado");
  }
  for (const e of (ficha.extras as Record<string, unknown>[] | undefined) ?? []) {
    if (e.mode === "opcional" && (e.price_delta === null || e.price_delta === undefined)) {
      warnings.push(`extras.${e.kind}: opcional sin price_delta, en la ficha va a decir "a consultar".`);
    }
  }

  if (photos.length) set("photos", photos, "fotos");
  else warnings.push("Sin fotos en Publicación/<Unidad>/fotos/: la ficha no se va a poder publicar.");

  // is_featured is the broker's ★ in /admin, never synced from the folder.
  if (prov.is_featured !== undefined) warnings.push("is_featured: se maneja desde /admin, se ignora.");

  return { ficha, origen, warnings, errors };
}

// ─── Comparing with what the site has ───────────────────────────────────────

export interface FieldDiff {
  field: string;
  site: unknown;
  ficha: unknown;
}

const COMPARED_FIELDS = [
  "property_type", "operation_type", "price_amount", "price_currency", "description",
  "surface_total", "surface_covered", "rooms", "bedrooms", "bathrooms", "garages", "year_built",
  "partida", "nomenclatura_catastral", "tags", "extras",
] as const;

function canon(field: string, v: unknown): string {
  if (v === undefined || v === null || v === "") return "";
  if (field === "tags") return [...(v as string[])].sort().join(",");
  if (field === "extras") {
    const list = (v as Record<string, unknown>[]).map((e) => ({
      kind: e.kind, mode: e.mode, detail: e.detail ?? null, price_delta: e.price_delta ?? null,
    }));
    list.sort((a, b) => String(a.kind).localeCompare(String(b.kind)));
    return JSON.stringify(list);
  }
  if (field === "partida") return normalizePartida(String(v)) ?? String(v);
  if (typeof v === "number" || /^-?\d+(\.\d+)?$/.test(String(v))) return String(Number(v));
  return String(v).trim();
}

/**
 * Field-by-field differences between the generated ficha and the row the
 * site already has for that address. A field the ficha does not set is not
 * a difference: the sync only ever asserts what the folder knows.
 */
export function diffAgainstSite(
  ficha: Record<string, unknown>,
  site: Record<string, unknown>,
): FieldDiff[] {
  const out: FieldDiff[] = [];
  for (const f of COMPARED_FIELDS) {
    if (ficha[f] === undefined) continue;
    if (canon(f, ficha[f]) !== canon(f, site[f])) out.push({ field: f, site: site[f] ?? null, ficha: ficha[f] });
  }
  return out;
}
