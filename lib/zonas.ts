import { PARTIDOS_ZONA_SUR } from "@/lib/zona-sur/partidos";
import { cheapestOffer, isOnOffer } from "@/lib/property/offers";
import { OWNER_PROPERTY_SOURCES } from "@/lib/db/property-sources";

/**
 * The zones the agency publishes in — the landing's covers, one slide each
 * (Tomy, 25-sep-2026: "como ahora se van agregando Villa del Dique, la costa,
 * etc., agregar ese slider como portada de la zona"; and "zona puede ser
 * Córdoba / Buenos Aires / La Costa por ahora, para simplificar").
 *
 * A zone is a name over a set of partidos (`properties.partido`; for Córdoba
 * the column holds the departamento, lib/zona-sur/localidades). Adding a zone
 * is an entry here — and a photo of its ground, when there is one. Without a
 * photo the slide shows the map of the zone instead: real ground, never a
 * stock picture (DIRECCION_DE_ARTE §2.5, §6).
 *
 * Pure: the rows come from lib/db/properties (getZoneCoverRows).
 */
export interface Zona {
  /** URL-safe key: `/propiedades?zona=<key>`. */
  key: string;
  name: string;
  /** The line under the name, on the cover. */
  tagline: string;
  partidos: readonly string[];
  /** An aerial photo of the zone, under /public; null until one exists. */
  photo: string | null;
}

export const ZONAS: readonly Zona[] = [
  {
    key: "buenos-aires",
    name: "Buenos Aires",
    tagline: "Zona Sur del Gran Buenos Aires",
    partidos: [...PARTIDOS_ZONA_SUR, "Presidente Perón", "San Vicente"],
    photo: null,
  },
  {
    key: "cordoba",
    name: "Córdoba",
    tagline: "Villa del Dique y el Valle de Calamuchita",
    partidos: ["Calamuchita"],
    photo: null,
  },
  {
    key: "la-costa",
    name: "La Costa",
    tagline: "Santa Teresita, Valeria del Mar y el partido de La Costa",
    partidos: ["La Costa", "Pinamar"],
    photo: null,
  },
];

export function zonaByKey(key: string | null | undefined): Zona | null {
  return key ? (ZONAS.find((z) => z.key === key) ?? null) : null;
}

export function zonaOfPartido(partido: string | null | undefined): Zona | null {
  return partido ? (ZONAS.find((z) => z.partidos.includes(partido)) ?? null) : null;
}

export interface CoverCandidate {
  source: string;
  partido: string | null;
  tags: unknown;
  price_amount: number | null;
  price_currency: "USD" | "ARS" | null;
  is_featured: boolean | null;
  created_at: string;
  photos: unknown;
}

const hasPhotos = (r: CoverCandidate) => Array.isArray(r.photos) && r.photos.length > 0;
const isOwner = (r: CoverCandidate) => (OWNER_PROPERTY_SOURCES as readonly string[]).includes(r.source);

/**
 * The one property that fronts a zone's cover.
 *
 * The same ladder the old protagonist climbed, now per zone, and one rung
 * longer because a zone may hold no family listing at all (Córdoba is the
 * family's other agency, published as a partner; La Costa is Laudani's):
 *   1. the family's cheapest offer in the zone (Tomy, 16-sep-2026);
 *   2. the family's starred listing (★ is_featured), rotating one per day;
 *   3. the cheapest offer of anyone in the zone;
 *   4. the dearest listing priced in dollars with a real gallery (three
 *      photos or more) — a zone's cover is its best-looking house, and in a
 *      catalog of somebody else's listings the price is the only signal of
 *      that the site has. The first day of Córdoba, "newest" picked a bare
 *      lot with two photos and no price.
 *   5. failing that, the most recently published.
 * A listing without photos never fronts anything: the cover is the photo.
 */
export function pickCover<T extends CoverCandidate>(rows: readonly T[], now = new Date()): T | null {
  const pool = rows.filter(hasPhotos);
  if (pool.length === 0) return null;
  const own = pool.filter(isOwner);

  const ownOffer = cheapestOffer(own);
  if (ownOffer) return ownOffer;

  const starred = own
    .filter((r) => r.is_featured === true)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (starred.length > 0) return starred[Math.floor(now.getTime() / 86_400_000) % starred.length];

  const anyOffer = cheapestOffer(pool);
  if (anyOffer) return anyOffer;

  const dearest = pool
    .filter((r) => r.price_currency === "USD" && r.price_amount !== null && (r.photos as unknown[]).length >= 3)
    .sort((a, b) => b.price_amount! - a.price_amount! || a.created_at.localeCompare(b.created_at))[0];
  if (dearest) return dearest;

  return [...pool].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
}

export interface ZoneCover<T> {
  zona: Zona;
  cover: T;
  /** Published listings in the zone, covers or not. */
  count: number;
}

/** One cover per zone that has anything published, in ZONAS order. */
export function zoneCovers<T extends CoverCandidate>(rows: readonly T[], now = new Date()): ZoneCover<T>[] {
  const out: ZoneCover<T>[] = [];
  for (const zona of ZONAS) {
    const inZone = rows.filter((r) => r.partido !== null && zona.partidos.includes(r.partido));
    const cover = pickCover(inZone, now);
    if (cover) out.push({ zona, cover, count: inZone.length });
  }
  return out;
}

export { isOnOffer };
