import { getZoneCoverRows, type ZoneCoverRow } from "@/lib/db/properties";
import { zoneCovers, type Zona } from "@/lib/zonas";
import { frameForPins } from "@/lib/map/frame";
import { pointsNearMedian } from "@/lib/market/geo";
import { formatPrice, labelWithOperation } from "@/lib/property/price";
import { propertyTypeLabel } from "@/lib/property/types";
import { extrasSpecWords, readExtras } from "@/lib/property/extras";
import { isOnOffer } from "@/lib/property/offers";
import { HomeZonasSlider, type ZonaSlide } from "@/components/home/HomeZonasSlider";

/**
 * The zone covers: one slide per zone the agency publishes in, each fronted
 * by one property (Tomy, 25-sep-2026). Took the protagonist's place: the
 * Buenos Aires slide shows what the protagonist showed — the family's
 * cheapest offer — and the other zones show theirs (lib/zonas, pickCover).
 *
 * Behind each card, the zone's ground. An aerial photo of the place when the
 * agency has one (`Zona.photo`); until then, the map of where its listings
 * are, blurred and tinted — real ground either way, never a stock picture
 * (DIRECCION_DE_ARTE §2.5, §6). The map is laid out with the same arithmetic
 * as the landing's map box (lib/map/frame), no Leaflet.
 *
 * Server Component: picks, formats, and hands plain data to the slider.
 */

/**
 * Small on purpose: the ground is a texture under a 70% tint and a blur, and
 * every tile is a request to the basemap's quota. 400×225 at 256 CSS pixels
 * per tile is six tiles per slide.
 */
const GROUND_BOX = { width: 400, height: 225 };

function slideFor(zona: Zona, cover: ZoneCoverRow, count: number, rows: ZoneCoverRow[]): ZonaSlide {
  const pins = pointsNearMedian(
    rows
      .filter((r) => r.partido !== null && zona.partidos.includes(r.partido) && r.lat !== null && r.lng !== null)
      .map((r) => ({ lat: r.lat as number, lng: r.lng as number })),
  );
  const ground = zona.photo
    ? null
    : frameForPins(pins, GROUND_BOX, { minSpanMeters: 8000, padding: 1.3, maxZoom: 12, supersample: 1 });

  const typeLabel = propertyTypeLabel(cover.property_type);
  const place = cover.localidad ?? cover.partido;
  const headline = cover.address ?? [typeLabel, place].filter(Boolean).join(" en ");
  const specs = [
    labelWithOperation(typeLabel, cover.operation_type),
    cover.rooms !== null ? `${cover.rooms} amb` : null,
    cover.bedrooms !== null ? `${cover.bedrooms} dorm` : null,
    // The declared surface, never the parcel's (Fase 12, and again Fase 34).
    cover.surface_total !== null ? `${cover.surface_total} m²` : null,
    ...extrasSpecWords(readExtras(cover.extras)),
  ].filter((s): s is string => Boolean(s));

  return {
    zona: { key: zona.key, name: zona.name, tagline: zona.tagline, photo: zona.photo },
    count,
    href: `/propiedades?ver=todas&zona=${zona.key}`,
    tiles: ground?.tiles ?? [],
    property: {
      id: cover.id,
      headline,
      place: cover.address ? place : null,
      priceText: formatPrice(cover.price_amount, cover.price_currency, cover.operation_type),
      offer: isOnOffer(cover.tags),
      specs,
      cover: cover.photos[0] ?? null,
    },
  };
}

export async function HomeZonas() {
  const rows = await getZoneCoverRows();
  const covers = zoneCovers(rows);
  if (covers.length === 0) return null;
  const slides = covers.map(({ zona, cover, count }) => slideFor(zona, cover, count, rows));
  return <HomeZonasSlider slides={slides} />;
}
