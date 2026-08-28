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
 * Basemap for the still maps this module draws.
 *
 * CartoDB Voyager, not OSM standard, and the reason is not taste. OSM
 * standard is a NAVIGATION map: its type is weighted to be read on its own,
 * so the town names end up the darkest ink in the frame and beat anything
 * drawn on top. Two rounds of tuning opacity on the home block only moved
 * the problem around — first the map went to grey pulp, then it came back
 * and won. CARTO's styles are built to sit *under* data, and Voyager is the
 * one that keeps some ground colour — the green of the parks, the ochre of
 * the avenues — so the block reads as a real place rather than a diagram.
 * Same tile scheme, so only this string changes.
 *
 * `@2x` because the box is drawn wider than its 206 projection pixels — on
 * a phone the tiles land at roughly 1.7x, and again at the screen's own 2x
 * or 3x. A standard tile stretched that far is mush, which reads as
 * sloppiness on the one block whose whole job is looking exact. The double
 * resolution costs ~89 kB instead of ~35 kB for this view, and it is spent
 * on the devices that actually have the pixels to show it.
 *
 * Whoever renders these has to show `BASEMAP_ATTRIBUTION` — both licences
 * require it.
 */
export const BASEMAP_URL =
  "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png";

/**
 * Intrinsic pixels of a basemap image, which is NOT `TILE_SIZE`.
 *
 * `TILE_SIZE` is projection geometry — how much ground a tile covers, and
 * the unit every offset from `tilesForView` is expressed in. This is how
 * many pixels the file actually has. Retina tiles double the second without
 * touching the first, so an `<img>` wants this for its intrinsic size and
 * `TILE_SIZE` for where to sit.
 */
export const BASEMAP_TILE_PIXELS = TILE_SIZE * 2;

/** Credit line the tile licences require alongside the map. */
export const BASEMAP_ATTRIBUTION = "© OpenStreetMap · © CARTO";

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
  urlTemplate = BASEMAP_URL,
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
