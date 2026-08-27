/**
 * Slippy-map tile arithmetic, so a small map can be a few `<img>` tags.
 *
 * The landing page wanted real ground under the cadastral outline, not a
 * Leaflet instance. Leaflet plus its stylesheet is around 45 kB gzipped
 * before a single tile loads, on a page with a 500 kB budget that is meant
 * to fly on a mid-range phone — and none of what it buys (panning, zooming,
 * layers, events) is wanted here. The block is a still image with a polygon
 * on top.
 *
 * This is the standard Web Mercator tile scheme every slippy map uses:
 * the world is one tile at zoom 0 and splits in four at each level.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface TileRef {
  x: number;
  y: number;
  z: number;
  url: string;
}

export const TILE_SIZE = 256;

/**
 * Drawing surface of the home page's cadastral diagram.
 *
 * Lives here, and not next to the component that draws it, because both a
 * Server Component and a Client Component need it. Next replaces a
 * `"use client"` module with a proxy in the server graph, so importing a
 * plain constant across that boundary hands the server `undefined` — with
 * no error, which is how this cost an afternoon.
 */
export const PARCEL_BOX = { width: 206, height: 166 };

/** Fractional tile coordinates — the whole-number part indexes the tile. */
export function pointToTile(point: LatLng, zoom: number): { x: number; y: number } {
  const n = 2 ** zoom;
  const latRad = (point.lat * Math.PI) / 180;
  return {
    x: ((point.lng + 180) / 360) * n,
    y:
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  };
}

/** Metres per pixel at a latitude and zoom — how the zoom gets chosen. */
export function metersPerPixel(lat: number, zoom: number): number {
  const EQUATOR_METERS = 40_075_016.686;
  return (
    (EQUATOR_METERS * Math.cos((lat * Math.PI) / 180)) / (TILE_SIZE * 2 ** zoom)
  );
}

/**
 * Deepest zoom at which a span of ground still fits in a box.
 *
 * Deepest rather than any: a city lot is perhaps 30 m across, and at the
 * zoom where a whole neighbourhood fits it would be a smudge. Capped at 19,
 * past which OSM has no tiles.
 */
export function zoomForSpan(
  lat: number,
  spanMeters: number,
  boxPixels: number,
  maxZoom = 19,
): number {
  for (let z = maxZoom; z >= 1; z--) {
    if (spanMeters / metersPerPixel(lat, z) <= boxPixels) return z;
  }
  return 1;
}

/**
 * The tiles covering a box of `width`×`height` pixels centred on a point,
 * each with the pixel offset it should be drawn at.
 *
 * Offsets can be negative — the first tile usually starts off the left edge,
 * which is what centres the view.
 */
export function tilesForView(
  center: LatLng,
  zoom: number,
  width: number,
  height: number,
  urlTemplate = "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
): { tiles: (TileRef & { left: number; top: number })[]; zoom: number } {
  const c = pointToTile(center, zoom);
  const n = 2 ** zoom;

  // Pixel position of the centre in the whole-world image at this zoom.
  const centerPxX = c.x * TILE_SIZE;
  const centerPxY = c.y * TILE_SIZE;
  const originX = centerPxX - width / 2;
  const originY = centerPxY - height / 2;

  const firstX = Math.floor(originX / TILE_SIZE);
  const firstY = Math.floor(originY / TILE_SIZE);
  const lastX = Math.floor((originX + width) / TILE_SIZE);
  const lastY = Math.floor((originY + height) / TILE_SIZE);

  const tiles: (TileRef & { left: number; top: number })[] = [];
  for (let ty = firstY; ty <= lastY; ty++) {
    // Above the north pole or below the south there is no tile to ask for.
    if (ty < 0 || ty >= n) continue;
    for (let tx = firstX; tx <= lastX; tx++) {
      // Longitude wraps, so a tile index outside the range is a real tile
      // on the other side of the world.
      const wrappedX = ((tx % n) + n) % n;
      tiles.push({
        x: wrappedX,
        y: ty,
        z: zoom,
        url: urlTemplate
          .replace("{z}", String(zoom))
          .replace("{x}", String(wrappedX))
          .replace("{y}", String(ty)),
        left: tx * TILE_SIZE - originX,
        top: ty * TILE_SIZE - originY,
      });
    }
  }

  return { tiles, zoom };
}
