/**
 * Area selection on a map, as arithmetic.
 *
 * Everything here is pure so the interesting part — deciding what falls
 * inside a drawn rectangle and what that selection is worth — can be tested
 * without a browser, a map, or a network. The Leaflet layer stays a thin
 * shell that draws the result.
 *
 * Longitude wrapping at the antimeridian is not handled: this reads Zona Sur
 * GBA, some 20.000 km from where that would matter. Worth knowing before
 * reusing the module somewhere it does.
 */

import { median, type MarketRow, usdPerM2, daysOnMarket } from "./stats";

export interface LatLng {
  lat: number;
  lng: number;
}

/** A rectangle, in the form Leaflet and the DB filter both want. */
export interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Builds a rectangle from the two corners of a drag. The user may drag in
 * any direction, so the corners arrive unordered and have to be sorted into
 * north/south/east/west rather than assumed.
 */
export function boundsFromCorners(a: LatLng, b: LatLng): Bounds {
  return {
    north: Math.max(a.lat, b.lat),
    south: Math.min(a.lat, b.lat),
    east: Math.max(a.lng, b.lng),
    west: Math.min(a.lng, b.lng),
  };
}

/** Inclusive on every edge — a point exactly on the line is inside. */
export function isInside(point: LatLng, bounds: Bounds): boolean {
  return (
    point.lat <= bounds.north &&
    point.lat >= bounds.south &&
    point.lng <= bounds.east &&
    point.lng >= bounds.west
  );
}

/** Smallest rectangle containing every point, or null if there are none. */
export function boundsOfPoints(points: LatLng[]): Bounds | null {
  if (points.length === 0) return null;
  let north = points[0].lat;
  let south = points[0].lat;
  let east = points[0].lng;
  let west = points[0].lng;
  for (const p of points) {
    if (p.lat > north) north = p.lat;
    if (p.lat < south) south = p.lat;
    if (p.lng > east) east = p.lng;
    if (p.lng < west) west = p.lng;
  }
  return { north, south, east, west };
}

/**
 * The rectangle where the points actually are, ignoring the far-flung few.
 *
 * A plain bounding box is at the mercy of its outliers. In this data 321 of
 * 324 listings sit in Lomas de Zamora and three sit in Quilmes, Lanús and
 * Avellaneda — enough to stretch the box so wide that its centre lands on
 * empty ground and the opening view is zoomed out past the point of being
 * readable.
 *
 * Trimming percentiles was the first answer, and it stopped working the day
 * a quarter of the catalog moved 700 km away: the family's agency in Villa
 * del Dique (Córdoba) publishes here too (lib/colegas, 25-sep-2026), and 39
 * pins out of 160 survive any sensible trim, so the box spanned the country.
 * Now the mass is what sits within `radiusMeters` of the median point — the
 * middle of the biggest group, wherever it is — and the trim runs on that
 * group. The rest is still drawn; it just stops deciding the camera.
 */
export function robustBoundsOfPoints(points: LatLng[], radiusMeters = 40_000, trim = 0.02): Bounds | null {
  if (points.length === 0) return null;
  const near = pointsNearMedian(points, radiusMeters);
  const group = near.length > 0 ? near : points;
  // Within the group, the percentile trim still shaves the stray few — the
  // three in Avellaneda against the three hundred in Lomas.
  if (group.length < 20) return boundsOfPoints(group);

  const at = (sorted: number[], q: number) =>
    sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))];

  const lats = group.map((p) => p.lat).sort((a, b) => a - b);
  const lngs = group.map((p) => p.lng).sort((a, b) => a - b);

  return {
    south: at(lats, trim),
    north: at(lats, 1 - trim),
    west: at(lngs, trim),
    east: at(lngs, 1 - trim),
  };
}

/**
 * The points within `radiusMeters` of the median point. The median is taken
 * per axis, which lands inside the largest group whenever that group holds
 * more than half of the points.
 */
export function pointsNearMedian<P extends LatLng>(points: P[], radiusMeters = 40_000): P[] {
  if (points.length === 0) return [];
  const mid = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor((sorted.length - 1) / 2)];
  };
  const center = { lat: mid(points.map((p) => p.lat)), lng: mid(points.map((p) => p.lng)) };
  const METERS_PER_DEGREE = 111_320;
  const cos = Math.cos((center.lat * Math.PI) / 180);
  return points.filter((p) => {
    const dLat = (p.lat - center.lat) * METERS_PER_DEGREE;
    const dLng = (p.lng - center.lng) * METERS_PER_DEGREE * cos;
    return Math.sqrt(dLat * dLat + dLng * dLng) <= radiusMeters;
  });
}

/**
 * Rough diagonal of a rectangle in metres. Used only to reject a stray click
 * that Leaflet reports as a zero-size drag, so a flat-earth approximation is
 * more than enough at neighbourhood scale.
 */
export function boundsDiagonalMeters(bounds: Bounds): number {
  const METERS_PER_DEGREE_LAT = 111_320;
  const midLat = ((bounds.north + bounds.south) / 2) * (Math.PI / 180);
  const dLat = (bounds.north - bounds.south) * METERS_PER_DEGREE_LAT;
  const dLng =
    (bounds.east - bounds.west) * METERS_PER_DEGREE_LAT * Math.cos(midLat);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

export interface AreaSummary {
  /** Listings whose coordinates fall inside. */
  count: number;
  /** Of those, how many could be priced per m². */
  pricedCount: number;
  medianUsdPerM2: number | null;
  medianDaysOnMarket: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  activeCount: number;
}

/**
 * What a selected area is worth knowing.
 *
 * Medians rather than averages, and it's not a stylistic preference: a
 * single mansion among twenty houses moves an average enough to make the
 * number useless for the thing this is for — reading what the surrounding
 * blocks are asking.
 */
export function summarizeArea(rows: MarketRow[]): AreaSummary {
  const perM2: number[] = [];
  const days: number[] = [];
  const prices: number[] = [];
  let activeCount = 0;

  for (const row of rows) {
    if (row.is_active) activeCount += 1;

    const v = usdPerM2(row);
    if (v !== null) perM2.push(v);

    const d = daysOnMarket(row);
    if (d !== null) days.push(d);

    // Only USD, because mixing currencies in one range would be nonsense
    // and the scraped set carries both.
    if (row.price_currency === "USD" && row.price_amount !== null) {
      const p = Number(row.price_amount);
      if (Number.isFinite(p) && p > 0) prices.push(p);
    }
  }

  return {
    count: rows.length,
    pricedCount: perM2.length,
    medianUsdPerM2: median(perM2),
    medianDaysOnMarket: median(days),
    minPrice: prices.length ? Math.min(...prices) : null,
    maxPrice: prices.length ? Math.max(...prices) : null,
    activeCount,
  };
}
