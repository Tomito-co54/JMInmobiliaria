import { canonicalLocalidad, partidoOfLocalidad } from "@/lib/zona-sur/localidades";
import type { PropertyType } from "@/lib/property/types";

/**
 * Reading a BuscadorProp site (Grupo Todo) — the platform Laudani & Cía and
 * Trezza run on — into the site's own shape.
 *
 * Plain HTTP, no browser: the pages are rendered on the server. The listing
 * is `/propiedades?infinito=1&pagina=N`, a JSON array of card HTML, twelve per
 * page, and an empty array past the last one. Each property is
 * `/propiedad/<id>`, with a JSON-LD block (coordinates) and sections with
 * stable ids: #caracteristicas, #comodidades, #acercade.
 *
 * Pure: fetching lives in scripts/sincronizar-colegas.ts. Every value the
 * site did not recognise is reported, never guessed — a listing with an
 * unknown type or place is left out of the catalog, not published wrong.
 */

export interface RawListing {
  externalId: string;
  title: string | null;
  /** Street and number, without the localidad. */
  street: string | null;
  /** The localidad as the source writes it ("Lomas De Zamora"). */
  localidadRaw: string | null;
  /** Segments of the address between the street and the localidad, if any. */
  addressParts: string[];
  operationRaw: string | null;
  priceRaw: string | null;
  typeRaw: string | null;
  /** The #caracteristicas items after the type, as text. */
  characteristics: string[];
  amenities: string[];
  descriptionHtml: string | null;
  photos: string[];
  lat: number | null;
  lng: number | null;
  reduced: boolean;
}

// --- text ---------------------------------------------------------------------

const ENTITIES: Record<string, string> = {
  amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " ",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú",
  Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú",
  ntilde: "ñ", Ntilde: "Ñ", uuml: "ü", Uuml: "Ü", iexcl: "¡", iquest: "¿",
  deg: "°", ordm: "º", ordf: "ª", sup2: "²", ldquo: "“", rdquo: "”", ndash: "–", mdash: "—",
};

/** Decodes HTML entities, twice: the JSON-LD arrives double-encoded (`&amp;oacute;`). */
export function decodeEntities(text: string): string {
  const once = (t: string) =>
    t.replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (m, e: string) => {
      if (e[0] === "#") {
        const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : m;
      }
      return ENTITIES[e] ?? m;
    });
  return once(once(text));
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/\r/g, "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " "))
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function oneLine(html: string): string {
  return stripTags(html).replace(/\s+/g, " ").trim();
}

// --- the listing pages ----------------------------------------------------------

/**
 * Property ids on one listing page, in order. The infinite-scroll endpoint
 * answers a JSON array of card HTML; a plain page answers HTML. Both work.
 */
export function listingIdsFromPage(body: string): string[] {
  let html = body;
  const trimmed = body.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parts = JSON.parse(trimmed) as unknown;
      html = Array.isArray(parts) ? parts.filter((p) => typeof p === "string").join("\n") : "";
    } catch {
      html = body;
    }
  }
  const ids: string[] = [];
  for (const m of html.matchAll(/\/propiedad\/(\d{4,})/g)) {
    if (!ids.includes(m[1])) ids.push(m[1]);
  }
  return ids;
}

// --- one property ---------------------------------------------------------------

function section(html: string, id: string): string | null {
  const m = html.match(new RegExp(`<section id="${id}"[^>]*>([\\s\\S]*?)</section>`));
  return m ? m[1] : null;
}

function listItems(html: string | null): string[] {
  if (!html) return [];
  return [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => oneLine(m[1])).filter(Boolean);
}

export function parseListingPage(html: string, externalId: string): RawListing {
  const title = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  const direccion = html.match(/<p class="direccion">([\s\S]*?)<\/p>/);
  const address = direccion ? oneLine(direccion[1]) : null;
  const operation = html.match(/<div class="precio-header">\s*<h2>([\s\S]*?)<\/h2>/);
  const price = html.match(/<p class="actual">([\s\S]*?)<\/p>/);
  const chars = listItems(section(html, "caracteristicas"));
  const about = section(html, "acercade");

  // The gallery is numbered: <id padded to 8>-01.jpg, -02.jpg… Order by the
  // number, keep one URL per number (the page repeats them in the slider).
  const padded = externalId.padStart(8, "0");
  const byNumber = new Map<number, string>();
  const photoRe = new RegExp(
    `https://(?:www\\.)?staticbp\\.com/img/prop_new_b/\\d+/${padded}-(\\d+)\\.jpg(?:\\?t=\\d+)?`,
    "g",
  );
  for (const m of html.matchAll(photoRe)) {
    const n = Number(m[1]);
    if (!byNumber.has(n)) byNumber.set(n, m[0]);
  }

  const lat = html.match(/"latitude"\s*:\s*"?(-?\d+(?:\.\d+)?)/);
  const lng = html.match(/"longitude"\s*:\s*"?(-?\d+(?:\.\d+)?)/);

  // "Street, Localidad" normally; a few carry a whole geocoded address in the
  // street field ("San Rafael 731, Turdera, Lomas De Zamora, Adrogué"). The
  // street is the first segment, the listing's own localidad the last, and
  // anything between is kept to be checked (normalizeListing).
  const segments = address ? address.split(",").map((s) => s.trim()).filter(Boolean) : [];

  return {
    externalId,
    title: title ? oneLine(title[1]) : null,
    street: segments[0] ?? null,
    localidadRaw: segments.length > 1 ? segments[segments.length - 1] : null,
    addressParts: segments.slice(1, -1),
    operationRaw: operation ? oneLine(operation[1]) : null,
    priceRaw: price ? oneLine(price[1]) : null,
    typeRaw: chars[0] ?? null,
    characteristics: chars.slice(1),
    amenities: listItems(section(html, "comodidades")),
    // The section's own heading is not part of the text.
    descriptionHtml: about ? about.replace(/<h2[\s\S]*?<\/h2>/, "") : null,
    photos: [...byNumber.entries()].sort((a, b) => a[0] - b[0]).map(([, url]) => url),
    lat: lat ? Number(lat[1]) : null,
    lng: lng ? Number(lng[1]) : null,
    reduced: html.includes("rebajado-tag"),
  };
}

// --- into the site's vocabulary ---------------------------------------------------

/**
 * BuscadorProp's types. "Dúplex/Tríplex" is a flat here, the reading the
 * maestra sync already gives "dúplex" (lib/admin/cartera-sync, parseTipo).
 */
const TYPES: Record<string, PropertyType> = {
  casas: "casa",
  departamentos: "departamento",
  "duplex/triplex": "departamento",
  ph: "ph",
  "lotes / terrenos": "lote",
  locales: "local",
  "inmuebles comerciales": "local",
  cocheras: "cochera",
  "depositos / galpones": "deposito",
  "galpones industriales": "galpon",
  oficinas: "oficina",
  "campos / chacras": "campo",
  campos: "campo",
};

const fold = (s: string) =>
  s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function mapType(raw: string | null): PropertyType | null {
  return raw ? (TYPES[fold(raw)] ?? null) : null;
}

/**
 * Places the source names its own way, or that live in two partidos. Laudani
 * works from Adrogué, so its "Barrio San José" and "Malvinas Argentinas" are
 * Almirante Brown's; its facet spells Canning as "Canning - Esteban
 * Echeverria".
 */
const PLACE_ALIASES: Record<string, { localidad: string; partido: string }> = {
  "barrio san jose": { localidad: "San José", partido: "Almirante Brown" },
  "san jose": { localidad: "San José", partido: "Almirante Brown" },
  canning: { localidad: "Canning", partido: "Esteban Echeverría" },
  "canning - esteban echeverria": { localidad: "Canning", partido: "Esteban Echeverría" },
  "malvinas argentinas": { localidad: "Malvinas Argentinas", partido: "Almirante Brown" },
};

export function mapPlace(raw: string | null): { localidad: string; partido: string } | null {
  if (!raw) return null;
  const alias = PLACE_ALIASES[fold(raw)];
  if (alias) return alias;
  const localidad = canonicalLocalidad(raw);
  if (!localidad) return null;
  const partido = partidoOfLocalidad(localidad);
  return partido ? { localidad, partido } : null;
}

export function parsePrice(raw: string | null): { amount: number; currency: "USD" | "ARS" } | null {
  if (!raw) return null;
  const currency = /^\s*u\$?s|usd/i.test(raw) ? "USD" : raw.includes("$") ? "ARS" : null;
  const digits = raw.replace(/[^\d]/g, "");
  if (!currency || !digits) return null;
  const amount = Number(digits);
  return amount > 0 ? { amount, currency } : null;
}

/** First integer of the first characteristic that matches. */
function countOf(items: string[], re: RegExp): number | null {
  for (const item of items) {
    if (!re.test(item)) continue;
    const n = item.match(/\d+/);
    if (n) return Number(n[0]);
  }
  return null;
}

function surfaceOf(items: string[], label: RegExp): number | null {
  for (const item of items) {
    if (!label.test(item)) continue;
    const n = item.match(/(\d+(?:[.,]\d+)?)\s*m/);
    if (n) return Number(n[1].replace(",", "."));
  }
  return null;
}

/**
 * "Antigüedad 15 años" → the year it was built; "A estrenar" → this year.
 * "En construcción" has no year yet: null, and the a_estrenar tag says it.
 */
export function yearBuiltOf(items: string[], now = new Date()): { year: number | null; brandNew: boolean } {
  const item = items.find((i) => /^antig/i.test(i));
  if (!item) return { year: null, brandNew: false };
  if (/a estrenar/i.test(item)) return { year: now.getFullYear(), brandNew: true };
  if (/construcci/i.test(item)) return { year: null, brandNew: true };
  const n = item.match(/(\d+)\s*a[ñn]o/i);
  return { year: n ? now.getFullYear() - Number(n[1]) : null, brandNew: false };
}

export function garagesOf(amenities: string[]): number | null {
  for (const a of amenities) {
    if (/sin cochera/i.test(a)) return 0;
    const n = a.match(/(\d+)\s*cochera/i);
    if (n) return Number(n[1]);
    if (/cochera/i.test(a)) return 1;
  }
  return null;
}

/**
 * Anything that would send a visitor to the partner instead of to Tomy: a
 * phone number, an email, a web address, the agency's name. The sentence that
 * carries it goes, not just the number — "no dude en consultarnos al" with the
 * number cut out reads as a broken page.
 */
const CONTACT =
  /laudani|https?:\/\/|www\.|\S+@\S+\.\w+|(?:\+?54\s?)?(?:9\s?)?(?:11|15)[\s.-]?\d{4}[\s.-]?\d{4}\b|\b4\d{3}[\s.-]\d{4}\b/i;

export function scrubContact(text: string): string {
  return text
    .split("\n")
    .map((line) =>
      line
        .split(/(?<=[.!?])\s+/)
        .filter((sentence) => !CONTACT.test(sentence))
        .join(" "),
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Most of the catalog is written in capitals. Shouting reads as noise next to
 * the rest of the site, so a text that is mostly upper case becomes plain
 * sentences. Names of places get their capital back; street names, which the
 * site cannot know, stay lower case — the lesser evil.
 */
export function sentenceCase(text: string, properNouns: readonly string[] = []): string {
  const letters = text.replace(/[^a-záéíóúüñ]/gi, "");
  if (!letters) return text;
  const upper = letters.replace(/[^A-ZÁÉÍÓÚÜÑ]/g, "").length;
  if (upper / letters.length < 0.6) return text;
  let out = text
    .toLowerCase()
    .replace(/(^|[.!?¡¿]\s+|\n\s*)([a-záéíóúüñ])/g, (_, lead: string, c: string) => lead + c.toUpperCase());
  for (const noun of properNouns) {
    // \b is ASCII-only in JS: it has no boundary after the é of "adrogué".
    const escaped = noun.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(`(?<!\\p{L})${escaped}(?!\\p{L})`, "gu"), noun);
  }
  return out;
}

// --- the row ---------------------------------------------------------------------

export interface ColegaRow {
  external_id: string;
  address: string | null;
  localidad: string | null;
  partido: string | null;
  property_type: PropertyType;
  operation_type: "venta" | "alquiler";
  price_amount: number | null;
  price_currency: "USD" | "ARS" | null;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  garages: number | null;
  surface_covered: number | null;
  surface_total: number | null;
  year_built: number | null;
  description: string | null;
  photos: string[];
  lat: number | null;
  lng: number | null;
  tags: string[];
}

export interface Normalized {
  row: ColegaRow | null;
  /** Why the listing cannot be published; empty when `row` is set. */
  errors: string[];
  warnings: string[];
}

export function normalizeListing(raw: RawListing, placeNames: readonly string[] = [], now = new Date()): Normalized {
  const errors: string[] = [];
  const warnings: string[] = [];

  const type = mapType(raw.typeRaw);
  if (!type) errors.push(`tipo desconocido: "${raw.typeRaw ?? ""}"`);

  const op = raw.operationRaw ? fold(raw.operationRaw) : "";
  const operation = op === "venta" ? "venta" : op === "alquiler" ? "alquiler" : null;
  if (!operation) errors.push(`operación desconocida: "${raw.operationRaw ?? ""}"`);

  // A localidad written in the address itself beats the listing's filing:
  // "San Rafael 731, Turdera, …" filed under Adrogué is in Turdera. The
  // written one is the more specific claim; the filing is often a default.
  const listed = mapPlace(raw.localidadRaw);
  const written = raw.addressParts.map(mapPlace).find((p) => p !== null) ?? null;
  const place = written ?? listed;
  if (written && listed && written.localidad !== listed.localidad) {
    warnings.push(`la dirección dice ${written.localidad} y el aviso está en ${listed.localidad}: se usa ${written.localidad}`);
  }
  if (!place) errors.push(`localidad desconocida: "${raw.localidadRaw ?? ""}"`);
  // Some addresses repeat the town in the street ("Capitán Moyano 1601
  // Llavallol, Llavallol"); the site shows the localidad on its own line.
  const street =
    raw.street && place
      ? raw.street.replace(new RegExp(`\\s+${place.localidad}$`, "iu"), "").trim() || raw.street
      : raw.street;

  if (raw.photos.length === 0) errors.push("sin fotos");

  const price = parsePrice(raw.priceRaw);
  if (!price) warnings.push(`sin precio legible: "${raw.priceRaw ?? ""}"`);

  const age = yearBuiltOf(raw.characteristics, now);
  const nouns = [...placeNames, ...(place ? [place.localidad] : [])];
  const body = raw.descriptionHtml ? scrubContact(sentenceCase(stripTags(raw.descriptionHtml), nouns)) : "";
  const title = raw.title ? scrubContact(sentenceCase(raw.title, nouns)) : "";
  const description = [title, body].filter(Boolean).join("\n\n") || null;

  if (errors.length > 0 || !type || !operation || !place) return { row: null, errors, warnings };

  return {
    row: {
      external_id: raw.externalId,
      address: street,
      localidad: place.localidad,
      partido: place.partido,
      property_type: type,
      operation_type: operation,
      price_amount: price?.amount ?? null,
      price_currency: price?.currency ?? null,
      rooms: countOf(raw.characteristics, /ambiente/i),
      bedrooms: countOf(raw.characteristics, /dormitorio(?!.*suite)/i) ?? countOf(raw.characteristics, /dormitorio/i),
      bathrooms: countOf(raw.characteristics, /baño/i),
      garages: garagesOf(raw.amenities),
      surface_covered: surfaceOf(raw.characteristics, /sup\.?\s*cubierta/i),
      surface_total: surfaceOf(raw.characteristics, /sup\.?\s*total/i),
      year_built: age.year,
      description,
      photos: raw.photos,
      lat: raw.lat,
      lng: raw.lng,
      tags: age.brandNew ? ["a_estrenar"] : [],
    },
    errors,
    warnings,
  };
}
