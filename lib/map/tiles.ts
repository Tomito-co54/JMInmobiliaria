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
 * Tile source for every map in the app, and the account it may need.
 *
 * OpenStreetMap's own servers are the fallback, not the plan. They are
 * volunteer-run and their usage policy forbids exactly what this is — a
 * site handing their tiles to its visitors — and they enforce it: past some
 * rate they answer **HTTP 200 with a PNG that reads "Access blocked"**.
 * That is worth stating plainly, because it defeats every check short of
 * looking at the pixels, and it is the second provider in a row to do it
 * (CARTO stamps "API KEY REQUIRED" the same way, also at 200).
 *
 * So the real answer is a provider with an account. Set
 * `NEXT_PUBLIC_BASEMAP_URL` to its tile template — CARTO and MapTiler both
 * have a free tier, both use this same tile scheme, and the key in the URL
 * is meant to be public for browser-side maps. Until that is set, the maps
 * run on OSM's goodwill and can go blank without an error anywhere.
 */
const OSM_FALLBACK_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export const BASEMAP_URL =
  process.env.NEXT_PUBLIC_BASEMAP_URL?.trim() || OSM_FALLBACK_URL;

/**
 * The credit line a tile URL obliges us to show.
 *
 * Every one of these providers redraws OpenStreetMap data, so OSM is always
 * credited; the provider is added when we can tell who it is. Derived from
 * the URL rather than configured separately so swapping providers cannot
 * leave the wrong name under the map.
 */
export function attributionFor(url: string): string {
  const osm = "© OpenStreetMap";
  if (/cartocdn.com/i.test(url)) return `${osm} · © CARTO`;
  if (/maptiler.com/i.test(url)) return `${osm} · © MapTiler`;
  if (/stadiamaps.com/i.test(url)) return `${osm} · © Stadia Maps`;
  return osm;
}

/** Credit line the tile licence requires alongside the map. */
export const BASEMAP_ATTRIBUTION = attributionFor(BASEMAP_URL);

/**
 * Device pixels we want per tile of ground.
 *
 * The box renders wider than its 206 projection pixels — on a phone the
 * tiles land at roughly 1.7x, and again at the screen's own 2x or 3x — so a
 * tile taken at face value arrives visibly soft, which reads as sloppiness
 * on the one block whose job is looking exact. Doubling is where the
 * returns flatten.
 */
const TARGET_TILE_PIXELS = 512;

/**
 * How many pixels a provider's tile actually has.
 *
 * Not cosmetic bookkeeping: MapTiler serves 512-pixel tiles covering the
 * same ground as everyone else's 256, so with it the doubling is already
 * paid for. OSM serves 256 and it is not.
 */
export function nativeTilePixelsFor(url: string): number {
  return /maptiler.com/i.test(url) ? 512 : TILE_SIZE;
}

export const BASEMAP_TILE_PIXELS = nativeTilePixelsFor(BASEMAP_URL);

/**
 * How many times deeper to take the ground, and shrink it back down.
 *
 * The second half of `TARGET_TILE_PIXELS`, for providers that don't hand it
 * over directly: take zoom+1 into a box of twice the pixels and draw it at
 * half size. Four times the detail — and, as a side effect that turns out to
 * matter more, every label rendered at half its usual size, which puts a
 * general-purpose basemap back underneath the overlay where it belongs
 * instead of competing with it.
 *
 * It costs tiles. The home's view goes from two to six, and z11 over dense
 * Buenos Aires is much heavier than z10: around 180 kB against 14 kB on OSM.
 * A provider with native 512-pixel tiles gets both benefits at 1, which is
 * most of why configuring one is worth the account.
 */
export const BASEMAP_SUPERSAMPLE = Math.max(
  1,
  Math.round(TARGET_TILE_PIXELS / BASEMAP_TILE_PIXELS),
);

/** A tile with its position already expressed as CSS percentages. */
export interface PlacedTile {
  url: string;
  left: string;
  top: string;
  width: string;
  height: string;
}

/**
 * The ground for a drawing box, ready to drop straight into CSS.
 *
 * Percentages rather than pixels so whatever renders these needs to know
 * nothing about the supersample factor or the box's pixel size: the tiles
 * scale with the width the box actually gets, without a resize listener.
 */
export function placedTilesForBox(
  center: LatLng,
  zoom: number,
  box: { width: number; height: number },
  supersample = BASEMAP_SUPERSAMPLE,
  urlTemplate = BASEMAP_URL,
): PlacedTile[] {
  const width = box.width * supersample;
  const height = box.height * supersample;
  const { tiles } = tilesForView(center, zoom, width, height, urlTemplate);
  const pct = (n: number) => `${(n * 100).toFixed(4)}%`;
  return tiles.map((t) => ({
    url: t.url,
    left: pct(t.left / width),
    top: pct(t.top / height),
    width: pct(TILE_SIZE / width),
    height: pct(TILE_SIZE / height),
  }));
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
