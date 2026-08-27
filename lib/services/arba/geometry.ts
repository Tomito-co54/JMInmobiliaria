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

/** A parcel's vertices and extent, in geographic coordinates. */
export interface ParcelShape {
  vertices: LatLng[];
  bounds: { north: number; south: number; east: number; west: number };
  center: LatLng;
  /** Longest side of the bounding box, in metres. */
  spanMeters: number;
}

/**
 * The parcel's outline as coordinates, not as pixels.
 *
 * It used to return SVG points scaled to fill a box. That is fine for a
 * diagram floating on nothing, and wrong the moment there is a map
 * underneath: the outline ends up at one scale and the ground at another,
 * and the parcel appears to sit across a street it doesn't touch. Projection
 * belongs to whoever is drawing, so it can be the same one the tiles use.
 */
export function parcelShape(rawResponse: unknown): ParcelShape | null {
  if (typeof rawResponse !== "object" || rawResponse === null) return null;
  const fc = rawResponse as { features?: unknown };
  if (!Array.isArray(fc.features) || fc.features.length === 0) return null;

  const rings = outerRings((fc.features[0] as { geometry?: unknown })?.geometry);
  if (rings.length === 0) return null;

  const vertices: LatLng[] = [];
  for (const ring of rings) {
    for (const point of ring) {
      if (!Array.isArray(point) || point.length < 2) continue;
      const [lng, lat] = point;
      if (typeof lat !== "number" || typeof lng !== "number") continue;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      vertices.push({ lat, lng });
    }
  }
  if (vertices.length < 3) return null;

  const lats = vertices.map((p) => p.lat);
  const lngs = vertices.map((p) => p.lng);
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

  const METERS_PER_DEGREE = 111_320;
  const spanMeters = Math.max(
    (bounds.north - bounds.south) * METERS_PER_DEGREE,
    (bounds.east - bounds.west) *
      METERS_PER_DEGREE *
      Math.cos((center.lat * Math.PI) / 180),
  );

  return { vertices, bounds, center, spanMeters };
}
