/**
 * Reading a point out of an ARBA parcel.
 *
 * The WFS answers with a GeoJSON FeatureCollection whose geometry is the
 * parcel outline. Two things need a single coordinate out of it: centring the
 * map, and giving an owner property real coordinates.
 *
 * That second use is the interesting one. Scraped listings get their position
 * from Nominatim, which resolves a street address to a point somewhere on the
 * block — good enough to place a pin. Owner properties are loaded by partida
 * and never geocoded, but the cadastre already knows exactly where the parcel
 * is, so the centroid is both free and more accurate than the geocoder would
 * have been.
 *
 * The average of the outline's vertices, not a true area centroid: for a city
 * parcel — near-rectangular, and small next to the map it centres — the two
 * differ by less than the pin's own width, and this needs no dependency.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

type Ring = number[][];

/** Pulls the outer ring out of whatever geometry shape ARBA returned. */
function outerRings(geometry: unknown): Ring[] {
  if (typeof geometry !== "object" || geometry === null) return [];
  const g = geometry as { type?: unknown; coordinates?: unknown };

  if (g.type === "Polygon" && Array.isArray(g.coordinates)) {
    const first = g.coordinates[0];
    return Array.isArray(first) ? [first as Ring] : [];
  }
  if (g.type === "MultiPolygon" && Array.isArray(g.coordinates)) {
    return (g.coordinates as unknown[])
      .map((poly) => (Array.isArray(poly) ? (poly[0] as Ring) : null))
      .filter((r): r is Ring => Array.isArray(r));
  }
  return [];
}

/**
 * Centre of the first parcel in an ARBA response, or null if the shape isn't
 * one this understands. GeoJSON orders coordinates [lng, lat] — reversed from
 * how everything else here names them.
 */
export function parcelCenter(rawResponse: unknown): LatLng | null {
  if (typeof rawResponse !== "object" || rawResponse === null) return null;
  const fc = rawResponse as { features?: unknown };
  if (!Array.isArray(fc.features) || fc.features.length === 0) return null;

  const feature = fc.features[0] as { geometry?: unknown };
  const rings = outerRings(feature?.geometry);
  if (rings.length === 0) return null;

  let sumLat = 0;
  let sumLng = 0;
  let n = 0;
  for (const ring of rings) {
    for (const point of ring) {
      if (!Array.isArray(point) || point.length < 2) continue;
      const [lng, lat] = point;
      if (typeof lat !== "number" || typeof lng !== "number") continue;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      sumLat += lat;
      sumLng += lng;
      n += 1;
    }
  }
  if (n === 0) return null;

  // Six decimals is roughly a tenth of a metre — past the point where more
  // precision means anything, and it keeps the cache key from splitting on
  // floating-point noise.
  return {
    lat: Number((sumLat / n).toFixed(6)),
    lng: Number((sumLng / n).toFixed(6)),
  };
}

/** A parcel outline ready to draw, plus where on Earth it sits. */
export interface ParcelOutline {
  /** SVG `points` for a <polygon>, fitted to the given box. */
  points: string;
  /** Geographic extent of the parcel, for placing map tiles behind it. */
  bounds: { north: number; south: number; east: number; west: number };
  center: LatLng;
}

/**
 * Projects a parcel's real outline into SVG coordinates.
 *
 * The home page used to draw a hand-written hexagon captioned "a believable
 * parcel", beside a paragraph promising the *exact* outline of the plot.
 * The real geometry simply wasn't stored anywhere until the cadastral cache
 * started keeping it.
 *
 * Equirectangular projection with a cosine correction on longitude. At the
 * scale of a single lot the difference from a proper Mercator is far below a
 * pixel, and it keeps the parcel from looking stretched sideways — which a
 * naive lat/lng-to-x/y mapping does at 34° south.
 *
 * The outline is scaled to fill the box and centred, preserving aspect
 * ratio: a long narrow lot has to still read as long and narrow.
 */
export function parcelOutline(
  rawResponse: unknown,
  width: number,
  height: number,
  padding = 8,
): ParcelOutline | null {
  if (typeof rawResponse !== "object" || rawResponse === null) return null;
  const fc = rawResponse as { features?: unknown };
  if (!Array.isArray(fc.features) || fc.features.length === 0) return null;

  const rings = outerRings((fc.features[0] as { geometry?: unknown })?.geometry);
  if (rings.length === 0) return null;

  const pts: LatLng[] = [];
  for (const ring of rings) {
    for (const point of ring) {
      if (!Array.isArray(point) || point.length < 2) continue;
      const [lng, lat] = point;
      if (typeof lat !== "number" || typeof lng !== "number") continue;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      pts.push({ lat, lng });
    }
  }
  if (pts.length < 3) return null;

  const lats = pts.map((p) => p.lat);
  const lngs = pts.map((p) => p.lng);
  const bounds = {
    north: Math.max(...lats),
    south: Math.min(...lats),
    east: Math.max(...lngs),
    west: Math.min(...lngs),
  };
  const center = {
    lat: (bounds.north + bounds.south) / 2,
    lng: (bounds.east + bounds.west) / 2,
  };

  const kx = Math.cos((center.lat * Math.PI) / 180);
  const spanX = (bounds.east - bounds.west) * kx;
  const spanY = bounds.north - bounds.south;
  if (spanX <= 0 && spanY <= 0) return null;

  const boxW = width - padding * 2;
  const boxH = height - padding * 2;
  const scale = Math.min(
    spanX > 0 ? boxW / spanX : Infinity,
    spanY > 0 ? boxH / spanY : Infinity,
  );
  if (!Number.isFinite(scale)) return null;

  const offsetX = padding + (boxW - spanX * scale) / 2;
  const offsetY = padding + (boxH - spanY * scale) / 2;

  const points = pts
    .map((p) => {
      const x = offsetX + (p.lng - bounds.west) * kx * scale;
      // SVG y grows downward, latitude grows upward.
      const y = offsetY + (bounds.north - p.lat) * scale;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return { points, bounds, center };
}
