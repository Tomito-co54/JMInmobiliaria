import { LOCALIDADES_FUERA_DE_ZONA_SUR, canonicalLocalidad, partidoOfLocalidad } from "@/lib/zona-sur/localidades";
import type { PropertyType } from "@/lib/property/types";
import {
  countOf,
  decodeEntities,
  fold,
  oneLine,
  parsePrice,
  scrubContact,
  sentenceCase,
  stripTags,
  yearBuiltOf,
  type ColegaRow,
  type Normalized,
} from "./buscadorprop";

/**
 * Reading a Pixel Inmobiliario site — the platform José Martino Inmobiliaria
 * (Villa del Dique, Córdoba; the family's other agency) rents — into the
 * site's own shape.
 *
 * Plain HTTP, no browser: server-rendered Bootstrap pages. The listing is
 * `/listing?user_id=<n>&purpose=sale&page=N`, nine cards per page, and the
 * page past the last one has no cards. Each property is `/ad/<slug>`; the
 * slug follows the title, so the stable id is the "Código" printed on the
 * card and on the page. The page has the state ("En Venta" / "Vendido"), the
 * title, the price, the type, five counters (dormitorios, ambientes, baños,
 * m² totales, m² cubiertos), a description, a list of amenities, the full
 * gallery, and a Google Maps embed whose `q=` carries the coordinates.
 *
 * Pure: fetching lives in scripts/sincronizar-colegas.ts. As with the other
 * reader, what the site cannot translate is reported, never guessed.
 */

export interface PixelListingEntry {
  /** The "Código" — stable; the slug changes with the title. */
  code: string;
  url: string;
  /** The card wears a "Vendido" ribbon. The page's own state is what counts. */
  sold: boolean;
}

/** Cards on one listing page, in order. None past the last page. */
export function listingEntriesFromPage(html: string): PixelListingEntry[] {
  const entries: PixelListingEntry[] = [];
  const cards = html.split(/<div class="thumbnail_one/).slice(1);
  for (const card of cards) {
    const url = card.match(/href="(https?:\/\/[^"]+\/ad\/[^"]+)"/);
    const code = card.match(/C(?:&oacute;|ó)digo:\s*(\d+)/);
    if (!url || !code) continue;
    if (entries.some((e) => e.code === code[1])) continue;
    entries.push({ code: code[1], url: url[1], sold: /"Featured">\s*Vendido/.test(card) });
  }
  return entries;
}

export interface RawAd {
  code: string;
  /** "En Venta", "En Alquiler", "Vendido"… as printed. */
  stateRaw: string | null;
  title: string | null;
  /** The address line, split on commas and trimmed. */
  addressParts: string[];
  priceRaw: string | null;
  typeRaw: string | null;
  /** The five counters, by their label as printed ("M² Totales" → 400). */
  counters: Record<string, number>;
  descriptionHtml: string | null;
  amenities: string[];
  photos: string[];
  lat: number | null;
  lng: number | null;
  videoUrl: string | null;
}

export function parseAdPage(html: string, code: string): RawAd {
  const state = html.match(/<div class="sale bg-pixel"[^>]*>\s*<div>([\s\S]*?)<\/div>/);
  const title = html.match(/<h5 class="mt_10 color-secondery">([\s\S]*?)<\/h5>/);
  const address = html.match(/<i class="fa fa-map-marker"[^>]*><\/i>([\s\S]*?)<\/p>/);
  const price = html.match(/<div class="property-price">[\s\S]*?<p class="sale bg-pixel"[^>]*>([\s\S]*?)<\/p>/);
  const type = html.match(/<div class="amount">([\s\S]*?)<\/div>/);
  const description = html.match(/Descripci(?:&oacute;|ó)n de la Propiedad<\/h4>\s*<p>([\s\S]*?)<\/p>/);
  const map = html.match(/maps\/embed\/v1\/place\?[^"]*q=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  const video = html.match(/https:\/\/www\.youtube\.com\/embed\/[A-Za-z0-9_-]+/);

  const counters: Record<string, number> = {};
  for (const m of html.matchAll(/<\/p>\s*([^<]+?)\s*<span class="number">\s*(\d+)\s*<\/span>/g)) {
    counters[oneLine(m[1])] = Number(m[2]);
  }

  const amenities = [...html.matchAll(/<i\s+class="fa fa-check"><\/i>([\s\S]*?)<\/li>/g)]
    .map((m) => oneLine(m[1]))
    .filter(Boolean);

  // The gallery: full-size files under uploads/<site>/images/, never the
  // thumbs the cards and og:image use. Once each, in page order.
  const photos: string[] = [];
  for (const m of html.matchAll(/https:\/\/[^"'\s]+\/uploads\/[^"'\s/]+\/images\/(?!thumbs\/)[^"'\s]+/g)) {
    if (!photos.includes(m[0])) photos.push(m[0]);
  }

  return {
    code,
    stateRaw: state ? oneLine(state[1]) : null,
    title: title ? oneLine(title[1]) : null,
    addressParts: address
      ? oneLine(address[1])
          .replace(/\.\s*$/, "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
    priceRaw: price ? oneLine(price[1]) : null,
    typeRaw: type ? oneLine(type[1]) : null,
    counters,
    descriptionHtml: description ? description[1] : null,
    amenities,
    photos,
    lat: map ? Number(map[1]) : null,
    lng: map ? Number(map[2]) : null,
    videoUrl: video ? video[0] : null,
  };
}

// --- into the site's vocabulary ---------------------------------------------------

/**
 * Pixel Inmobiliario's types, as this catalog uses them. "Complejo" (eight PH
 * sold together) and "Inmueble en block" (a whole building) have no
 * counterpart in lib/property/types and are reported, not guessed.
 */
const TYPES: Record<string, PropertyType> = {
  casa: "casa",
  "casa con terreno": "casa",
  terreno: "lote",
  lote: "lote",
  departamento: "departamento",
  ph: "ph",
  local: "local",
  oficina: "oficina",
  cochera: "cochera",
  galpon: "galpon",
  deposito: "deposito",
  campo: "campo",
};

export function mapPixelType(raw: string | null): PropertyType | null {
  return raw ? (TYPES[fold(raw)] ?? null) : null;
}

/** The places this reader may publish: Calamuchita's towns, by canonical name. */
const CALAMUCHITA = new Set(LOCALIDADES_FUERA_DE_ZONA_SUR.Calamuchita);

/**
 * "Av. de los Navegantes, Villa del Dique, Córdoba, Argentina, Villa Del
 * Dique, Córdoba, Argentina." — the street (when there is one; most say only
 * the town), the town, and a province and country repeated. A postal code
 * ("X5862 Villa del Dique") is the town with a prefix, not a street.
 */
export function placeOf(parts: string[]): { street: string | null; localidad: string | null } {
  let localidad: string | null = null;
  let street: string | null = null;
  for (const part of parts) {
    const bare = part.replace(/^X\d{4}\s+/, "");
    const town = canonicalLocalidad(bare);
    if (town && CALAMUCHITA.has(town)) {
      localidad ??= town;
      continue;
    }
    if (/^(c[oó]rdoba|argentina)$/i.test(fold(bare))) continue;
    if (/^X\d{4}$/.test(part)) continue;
    street ??= part;
  }
  return { street, localidad };
}

/**
 * A price in pesos on a sale in this catalog is a typing slip — "$ 13.000"
 * on a 439 m² lot next to lots at USD 50.000 — and a wrong price published
 * is worse than "consultar". Below this many pesos a sale price is not one.
 */
const MIN_PLAUSIBLE_ARS_SALE = 1_000_000;
/** Same floor the market dashboard uses (lib/market/stats): below it, a surface is a typo. */
const MIN_PLAUSIBLE_SURFACE_M2 = 10;

export function normalizeAd(
  raw: RawAd,
  placeNames: readonly string[] = [],
  now = new Date(),
  scrubWords: readonly string[] = [],
): Normalized & { sold: boolean } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const state = raw.stateRaw ? fold(raw.stateRaw) : "";
  const sold = state === "vendido" || state === "vendida";
  const operation = state === "en venta" || sold ? "venta" : state === "en alquiler" ? "alquiler" : null;
  if (!operation) errors.push(`estado desconocido: "${raw.stateRaw ?? ""}"`);

  const type = mapPixelType(raw.typeRaw);
  if (!type) errors.push(`tipo desconocido: "${raw.typeRaw ?? ""}"`);

  const { street, localidad } = placeOf(raw.addressParts);
  const partido = localidad ? partidoOfLocalidad(localidad) : null;
  if (!localidad || !partido) errors.push(`localidad desconocida: "${raw.addressParts.join(", ")}"`);

  if (raw.photos.length === 0) errors.push("sin fotos");

  let price = parsePrice(raw.priceRaw);
  if (!price) warnings.push(`sin precio legible: "${raw.priceRaw ?? ""}"`);
  else if (operation === "venta" && price.currency === "ARS" && price.amount < MIN_PLAUSIBLE_ARS_SALE) {
    warnings.push(`precio inverosímil para una venta: "${raw.priceRaw}" — se publica sin precio`);
    price = null;
  }

  const age = yearBuiltOf(raw.amenities, now);
  const nouns = [...placeNames, ...(localidad ? [localidad] : [])];
  const body = raw.descriptionHtml ? scrubContact(sentenceCase(stripTags(raw.descriptionHtml), nouns), scrubWords) : "";
  const title = raw.title ? scrubContact(sentenceCase(decodeEntities(raw.title).replace(/\s*!+\s*$/, ""), nouns), scrubWords) : "";
  const description = [title, body].filter(Boolean).join("\n\n") || null;

  const garages = raw.amenities.some((a) => /cochera|garage/i.test(a)) ? 1 : null;
  const counter = (label: RegExp) => {
    const key = Object.keys(raw.counters).find((k) => label.test(k));
    return key ? raw.counters[key] : null;
  };
  // "M² Totales 3 · M² Cubiertos 2" on a house is a slip of the form (the
  // room counts typed into the surface fields). A surface under ten metres is
  // not one; it is left out and said, like the price above.
  const surface = (label: RegExp, name: string) => {
    const n = counter(label);
    if (n !== null && n < MIN_PLAUSIBLE_SURFACE_M2) {
      warnings.push(`${name} inverosímil: ${n} m² — se publica sin ese dato`);
      return null;
    }
    return n;
  };

  if (errors.length > 0 || !type || !operation || !localidad || !partido) return { row: null, errors, warnings, sold };

  return {
    row: {
      external_id: raw.code,
      address: street,
      nomenclatura_catastral: null,
      localidad,
      partido,
      property_type: type,
      operation_type: operation,
      price_amount: price?.amount ?? null,
      price_currency: price?.currency ?? null,
      rooms: counter(/ambientes/i),
      bedrooms: counter(/dormitorios/i),
      bathrooms: counter(/ba[ñn]os/i),
      garages,
      surface_covered: surface(/cubiertos/i, "superficie cubierta"),
      surface_total: surface(/totales/i, "superficie total"),
      year_built: age.year,
      description,
      photos: raw.photos,
      lat: raw.lat,
      lng: raw.lng,
      tags: age.brandNew || /a estrenar/i.test(raw.title ?? "") ? ["a_estrenar"] : [],
    } satisfies ColegaRow,
    errors,
    warnings,
    sold,
  };
}

// Keep the helper the tests reach for.
export { countOf };
