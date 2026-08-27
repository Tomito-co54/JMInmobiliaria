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
  // OSM standard. Worth knowing before tuning opacity again: it is a
  // NAVIGATION map, with type weighted to be read on its own, which is why
  // it keeps overpowering anything drawn on top of it. If the home block
  // still fights its basemap, the answer is probably a light style built to
  // sit under data — CartoDB Positron uses this same tile scheme, so only
  // this string changes.
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

/**
 * Where a coordinate lands inside a view, in box pixels.
 *
 * The one function that makes an overlay trustworthy. Drawing a parcel by
 * scaling its outline to fit the frame, while the tiles underneath sit at
 * whatever zoom was chosen separately, produces a picture where the two
 * disagree — the outline drawn over a block it does not occupy. On a page
 * that promises "el polígono exacto de la parcela", that is worse than
 * showing no map at all.
 *
 * Same projection as `tilesForView`, same origin, so anything placed with
 * this lands exactly where the map says it is.
 */
export function projectToView(
  point: LatLng,
  center: LatLng,
  zoom: number,
  width: number,
  height: number,
): { x: number; y: number } {
  const c = pointToTile(center, zoom);
  const p = pointToTile(point, zoom);
  return {
    x: (p.x - c.x) * TILE_SIZE + width / 2,
    y: (p.y - c.y) * TILE_SIZE + height / 2,
  };
}

/**
 * How much ground to show around a parcel.
 *
 * Wider than the lot so it sits in its block — a parcel filling the frame
 * edge to edge reads as an abstract shape again, which is the thing the map
 * was added to fix.
 */
export const PARCEL_VIEW_FACTOR = 1.7;
