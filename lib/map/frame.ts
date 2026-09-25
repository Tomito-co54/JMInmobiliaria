import {
  BASEMAP_SUPERSAMPLE,
  placedTilesForBox,
  projectToView,
  zoomForSpan,
  type LatLng,
  type PlacedTile,
} from "@/lib/map/tiles";

/**
 * A still of the ground around some pins: the tiles that cover a box, and
 * where each pin falls in it, both as CSS percentages.
 *
 * Shared by the landing's map box (HomeMapTeaser) and the zone covers
 * (HomeZonas): same arithmetic, same projection, so a pin sits on its block
 * in both. No Leaflet — the landing is the page that has to load fastest.
 */

const METERS_PER_DEGREE = 111_320;

export interface FrameOptions {
  /** Never tighter than this, so one building does not become a satellite photo of itself. */
  minSpanMeters?: number;
  /** Ground shown around the pins' extent. */
  padding?: number;
  maxZoom?: number;
  supersample?: number;
}

export interface Frame {
  center: LatLng;
  zoom: number;
  tiles: PlacedTile[];
  /** Where a point lands in the box, as percentages of its width and height. */
  place(point: LatLng): { left: string; top: string };
}

export function frameForPins(
  pins: readonly LatLng[],
  box: { width: number; height: number },
  { minSpanMeters = 1200, padding = 1.6, maxZoom = 16, supersample = BASEMAP_SUPERSAMPLE }: FrameOptions = {},
): Frame | null {
  if (pins.length === 0) return null;
  const lats = pins.map((p) => p.lat);
  const lngs = pins.map((p) => p.lng);
  const center = {
    lat: (Math.max(...lats) + Math.min(...lats)) / 2,
    lng: (Math.max(...lngs) + Math.min(...lngs)) / 2,
  };
  const cos = Math.cos((center.lat * Math.PI) / 180);
  const latSpan = Math.max((Math.max(...lats) - Math.min(...lats)) * METERS_PER_DEGREE, minSpanMeters);
  const lngSpan = Math.max((Math.max(...lngs) - Math.min(...lngs)) * METERS_PER_DEGREE * cos, minSpanMeters);

  // Ground taken at supersample scale and drawn at box size — see
  // BASEMAP_SUPERSAMPLE and the coverage block, which does the same.
  const s = supersample;
  const zoom = Math.min(
    zoomForSpan(center.lat, lngSpan * padding, box.width * s),
    zoomForSpan(center.lat, latSpan * padding, box.height * s),
    maxZoom,
  );
  const tiles = placedTilesForBox(center, zoom, box, s);
  const place = (p: LatLng) => {
    const q = projectToView(p, center, zoom, box.width * s, box.height * s);
    return {
      left: `${((q.x / s / box.width) * 100).toFixed(2)}%`,
      top: `${((q.y / s / box.height) * 100).toFixed(2)}%`,
    };
  };
  return { center, zoom, tiles, place };
}
