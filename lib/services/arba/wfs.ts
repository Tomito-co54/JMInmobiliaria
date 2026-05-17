/**
 * ARBA cadastral data via GeoServer WFS.
 *
 * Endpoint: https://geo.arba.gov.ar/geoserver/idera/wfs (public, no auth).
 * Layer:    idera:Parcela
 *
 * Fields we extract:
 *   pda  → partida (9 digits, first 3 = partido code)
 *   cca  → nomenclatura catastral (43 chars, concatenated form)
 *   ara1 → surface in m² (string with comma decimal: "4181,99")
 *   tpa  → 'Urbano' | 'Rural' | etc.
 *
 * Strategy:
 *   1. INTERSECTS(point) — exact hit (point falls inside the parcel polygon).
 *   2. If miss, DWITHIN(point, 30m) and pick the parcel whose centroid is
 *      closest to our point. This absorbs the few-meters offset from
 *      Nominatim geocoding.
 *
 * Rate limit: 1 req/sec (no published policy, but courtesy — public infra,
 * single admin contact email geo@arba.gov.ar).
 */

const WFS_URL = "https://geo.arba.gov.ar/geoserver/idera/wfs";
const SEARCH_RADIUS_METERS = 30;
const MIN_INTERVAL_MS = 1000;
let lastRequestAt = 0;

export class ArbaWfsError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "ArbaWfsError";
  }
}

export interface ParcelResult {
  /** Trimmed partida. Null when ARBA returned an empty/whitespace pda — that
   *  happens for parcels that exist in cartography but have no fiscal ID
   *  attached yet. Surface and nomenclatura can still be useful in that case. */
  partida: string | null;
  nomenclatura: string;
  surfaceM2: number | null;
  tipo: string | null;
  matchStrategy: "intersects" | "dwithin";
  distanceMeters: number;
  rawResponse: WfsFeatureCollection;
}

interface WfsProperties {
  pda?: string;
  cca?: string;
  // ARBA's WFS serializes ara1 as a Spanish-decimal string ("4181,99") for
  // non-integer values but a plain number for integers. We accept both.
  ara1?: string | number;
  tpa?: string;
  sag?: string;
}

interface WfsGeometry {
  type: "MultiPolygon" | "Polygon";
  coordinates: number[][][][] | number[][][];
}

interface WfsFeature {
  type: "Feature";
  id?: string;
  properties: WfsProperties;
  geometry?: WfsGeometry | null;
}

interface WfsFeatureCollection {
  type: "FeatureCollection";
  features: WfsFeature[];
  numberReturned: number;
  totalFeatures: number;
}

async function fetchWfs(cqlFilter: string, count: number): Promise<WfsFeatureCollection> {
  const wait = MIN_INTERVAL_MS - (Date.now() - lastRequestAt);
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastRequestAt = Date.now();

  const url = new URL(WFS_URL);
  url.searchParams.set("service", "WFS");
  url.searchParams.set("version", "2.0.0");
  url.searchParams.set("request", "GetFeature");
  url.searchParams.set("typeNames", "idera:Parcela");
  url.searchParams.set("outputFormat", "application/json");
  url.searchParams.set("srsName", "EPSG:4326");
  url.searchParams.set("CQL_FILTER", cqlFilter);
  url.searchParams.set("count", String(count));

  const userAgent =
    process.env.SCRAPER_USER_AGENT || "JotaemeBot/1.0 (contact@jotaeme.com)";

  const response = await fetch(url.toString(), {
    headers: { "User-Agent": userAgent, "Accept": "application/json" },
  });

  if (!response.ok) {
    throw new ArbaWfsError(
      `WFS returned ${response.status} ${response.statusText}`,
      response.status,
    );
  }
  return (await response.json()) as WfsFeatureCollection;
}

/**
 * Parses surface from ARBA's WFS. Accepts both string ("4181,99" with Spanish
 * decimal comma) and number (returned for integer surfaces). Returns null if
 * unparseable.
 */
function parseSurface(raw: string | number | undefined | null): number | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== "string") return null;
  const normalized = raw.replace(/\./g, "").replace(",", ".");
  const value = parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

/**
 * Rough centroid of a MultiPolygon or Polygon by averaging all coordinate
 * pairs. Good enough for picking the closest parcel within a 30m radius —
 * we're not computing area or storing the centroid, just comparing distances.
 */
function roughCentroid(geometry: WfsGeometry | null | undefined): [number, number] | null {
  if (!geometry) return null;
  let sumLng = 0;
  let sumLat = 0;
  let count = 0;

  function walk(coords: unknown): void {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === "number" && typeof coords[1] === "number") {
      sumLng += coords[0] as number;
      sumLat += coords[1] as number;
      count++;
      return;
    }
    for (const child of coords) walk(child);
  }
  walk(geometry.coordinates);

  if (count === 0) return null;
  return [sumLng / count, sumLat / count];
}

/**
 * Haversine distance in meters between two (lat, lng) pairs.
 */
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function featureToResult(
  feature: WfsFeature,
  matchStrategy: "intersects" | "dwithin",
  distanceMeters: number,
  rawResponse: WfsFeatureCollection,
): ParcelResult | null {
  const partida = feature.properties.pda?.trim() || null;
  const nomenclatura = feature.properties.cca?.trim();
  if (!nomenclatura) return null;
  return {
    partida,
    nomenclatura,
    surfaceM2: parseSurface(feature.properties.ara1),
    tipo: feature.properties.tpa?.trim() || null,
    matchStrategy,
    distanceMeters,
    rawResponse,
  };
}

/**
 * Looks up the parcel that contains (or is nearest to) a (lat, lng) point.
 * Returns null when no parcel is found within SEARCH_RADIUS_METERS.
 */
export async function getParcelByPoint(
  lat: number,
  lng: number,
): Promise<ParcelResult | null> {
  // Step 1 — exact INTERSECTS.
  const intersectsFilter = `INTERSECTS(geom, SRID=4326;POINT(${lng} ${lat}))`;
  const intersects = await fetchWfs(intersectsFilter, 1);
  if (intersects.numberReturned > 0 && intersects.features.length > 0) {
    const result = featureToResult(intersects.features[0], "intersects", 0, intersects);
    if (result) return result;
  }

  // Step 2 — DWITHIN fallback. Request geometry so we can pick the closest.
  const dwithinFilter = `DWITHIN(geom, SRID=4326;POINT(${lng} ${lat}), ${SEARCH_RADIUS_METERS}, meters)`;
  const dwithin = await fetchWfs(dwithinFilter, 10);
  if (dwithin.numberReturned === 0 || dwithin.features.length === 0) return null;

  // Pick the feature whose rough centroid is closest to our point.
  let best: { feature: WfsFeature; distance: number } | null = null;
  for (const feature of dwithin.features) {
    const centroid = roughCentroid(feature.geometry);
    if (!centroid) continue;
    const distance = haversineMeters(lat, lng, centroid[1], centroid[0]);
    if (!best || distance < best.distance) {
      best = { feature, distance };
    }
  }
  if (!best) return null;

  return featureToResult(best.feature, "dwithin", best.distance, dwithin);
}
