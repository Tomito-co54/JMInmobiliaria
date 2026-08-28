import { describe, it, expect } from "vitest";
import {
  pointToTile,
  metersPerPixel,
  zoomForSpan,
  tilesForView,
  projectToView,
  TILE_SIZE,
  PARCEL_VIEW_FACTOR,
  BASEMAP_URL,
  BASEMAP_ATTRIBUTION,
  attributionFor,
  nativeTilePixelsFor,
  BASEMAP_TILE_PIXELS,
  BASEMAP_SUPERSAMPLE,
  placedTilesForBox,
  PARCEL_BOX,
} from "./tiles";

/** Belgrano 1285, Lomas de Zamora — the featured property's parcel. */
const LOMAS = { lat: -34.7462, lng: -58.3919 };

describe("pointToTile", () => {
  it("puts the world in one tile at zoom 0", () => {
    const t = pointToTile({ lat: 0, lng: 0 }, 0);
    expect(t.x).toBeCloseTo(0.5, 6);
    expect(t.y).toBeCloseTo(0.5, 6);
  });

  it("splits into four at zoom 1, with Zona Sur in the bottom-left", () => {
    // Southern hemisphere, western longitude.
    const t = pointToTile(LOMAS, 1);
    expect(t.x).toBeLessThan(1);
    expect(t.y).toBeGreaterThan(1);
  });

  it("grows the grid by a power of two per level", () => {
    const z10 = pointToTile(LOMAS, 10);
    const z11 = pointToTile(LOMAS, 11);
    expect(z11.x).toBeCloseTo(z10.x * 2, 6);
    expect(z11.y).toBeCloseTo(z10.y * 2, 6);
  });
});

describe("metersPerPixel", () => {
  it("halves with each zoom level", () => {
    const a = metersPerPixel(LOMAS.lat, 15);
    const b = metersPerPixel(LOMAS.lat, 16);
    expect(b).toBeCloseTo(a / 2, 6);
  });

  it("shrinks away from the equator", () => {
    expect(metersPerPixel(-34.75, 16)).toBeLessThan(metersPerPixel(0, 16));
  });
});

describe("zoomForSpan", () => {
  it("picks a street-level zoom for a city lot", () => {
    // ~40 m of ground in a 200 px box. Too far out and the parcel is a
    // smudge; too far in and it spills past the edges.
    const z = zoomForSpan(LOMAS.lat, 40, 200);
    expect(z).toBeGreaterThanOrEqual(17);
    expect(z).toBeLessThanOrEqual(19);
  });

  it("zooms out for a whole neighbourhood", () => {
    expect(zoomForSpan(LOMAS.lat, 3000, 200)).toBeLessThan(
      zoomForSpan(LOMAS.lat, 40, 200),
    );
  });

  it("never asks for a zoom OSM doesn't serve", () => {
    expect(zoomForSpan(LOMAS.lat, 0.5, 200)).toBeLessThanOrEqual(19);
  });

  it("falls back to the widest view for an impossible span", () => {
    expect(zoomForSpan(LOMAS.lat, 40_000_000, 10)).toBe(1);
  });
});

describe("tilesForView", () => {
  it("covers the whole box", () => {
    const { tiles } = tilesForView(LOMAS, 18, 400, 300);
    expect(tiles.length).toBeGreaterThan(0);
    const right = Math.max(...tiles.map((t) => t.left + TILE_SIZE));
    const bottom = Math.max(...tiles.map((t) => t.top + TILE_SIZE));
    expect(Math.min(...tiles.map((t) => t.left))).toBeLessThanOrEqual(0);
    expect(right).toBeGreaterThanOrEqual(400);
    expect(bottom).toBeGreaterThanOrEqual(300);
  });

  it("starts off the left edge, which is what centres the view", () => {
    const { tiles } = tilesForView(LOMAS, 18, 400, 300);
    expect(Math.min(...tiles.map((t) => t.left))).toBeLessThanOrEqual(0);
  });

  it("builds a real basemap url with every placeholder filled", () => {
    const { tiles } = tilesForView(LOMAS, 18, 256, 256);
    const t = tiles[0];
    expect(t.url).toBe(
      BASEMAP_URL.replace("{z}", String(t.z))
        .replace("{x}", String(t.x))
        .replace("{y}", String(t.y)),
    );
    expect(t.url).not.toContain("{");
  });

  it("falls back to OSM when no provider is configured", () => {
    // The env var is what a real deployment sets; with none, the maps still
    // draw rather than breaking.
    expect(BASEMAP_URL).toContain("{z}");
    expect(BASEMAP_URL).toContain("{x}");
    expect(BASEMAP_URL).toContain("{y}");
    if (!process.env.NEXT_PUBLIC_BASEMAP_URL) {
      expect(BASEMAP_URL).toContain("tile.openstreetmap.org");
    }
  });

  // Every provider here redraws OSM data, so OSM is always credited. Derived
  // from the URL so a provider swap cannot leave the wrong name under the
  // map — a licence term, not a caption.
  it("credits OSM plus whoever served the tiles", () => {
    expect(BASEMAP_ATTRIBUTION).toContain("OpenStreetMap");
    expect(attributionFor("https://tile.openstreetmap.org/1/2/3.png")).toBe(
      "© OpenStreetMap",
    );
    expect(
      attributionFor("https://basemaps.cartocdn.com/rastertiles/voyager/1/2/3.png"),
    ).toContain("CARTO");
    expect(
      attributionFor("https://api.maptiler.com/maps/basic/1/2/3.png?key=abc"),
    ).toContain("MapTiler");
  });

  it("gets 512 device pixels per tile, from wherever the provider has them", () => {
    // MapTiler serves them directly; OSM does not and has to be supersampled.
    expect(nativeTilePixelsFor("https://api.maptiler.com/maps/basic-v2/1/2/3.png")).toBe(512);
    expect(nativeTilePixelsFor("https://tile.openstreetmap.org/1/2/3.png")).toBe(TILE_SIZE);
    expect(BASEMAP_SUPERSAMPLE * BASEMAP_TILE_PIXELS).toBe(512);
  });

  it("draws the ground from one zoom deeper, at half size", () => {
    // The supersample is what keeps the basemap's type from beating the
    // overlay, and what keeps the tiles sharp on a phone. Both halves are
    // invisible in a screenshot of the geometry, so they are pinned here.
    const s = 2;
    const plain = tilesForView(LOMAS, 12, PARCEL_BOX.width, PARCEL_BOX.height);
    const supersampled = placedTilesForBox(LOMAS, 13, PARCEL_BOX, s);
    expect(supersampled.length).toBeGreaterThan(plain.tiles.length);

    // Positions arrive as CSS percentages, so nothing downstream has to know
    // the supersample factor or the box's pixel size.
    for (const t of supersampled) {
      for (const v of [t.left, t.top, t.width, t.height]) {
        expect(v.endsWith("%")).toBe(true);
        expect(Number.isFinite(parseFloat(v))).toBe(true);
      }
    }
    // A tile covers 1/s of the width it would at face value.
    expect(parseFloat(supersampled[0].width)).toBeCloseTo(
      (TILE_SIZE / (PARCEL_BOX.width * s)) * 100,
      3,
    );
  });

  it("keeps tile indices inside the grid", () => {
    const n = 2 ** 18;
    const { tiles } = tilesForView(LOMAS, 18, 900, 900);
    for (const t of tiles) {
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.x).toBeLessThan(n);
      expect(t.y).toBeGreaterThanOrEqual(0);
      expect(t.y).toBeLessThan(n);
    }
  });

  it("wraps longitude instead of asking for a tile that doesn't exist", () => {
    // At the antimeridian the box straddles the edge of the grid.
    const { tiles } = tilesForView({ lat: 0, lng: 179.99 }, 3, 600, 200);
    const n = 2 ** 3;
    expect(tiles.every((t) => t.x >= 0 && t.x < n)).toBe(true);
  });

  it("asks for few tiles at the size the home uses", () => {
    // The point of this module is being lighter than a map library. If a
    // small block needed a dozen requests, it wouldn't be.
    const { tiles } = tilesForView(LOMAS, 18, 320, 260);
    expect(tiles.length).toBeLessThanOrEqual(6);
  });
});

describe("projectToView", () => {
  const CENTER = LOMAS;
  const W = 206;
  const H = 166;

  it("puts the centre in the middle of the box", () => {
    const p = projectToView(CENTER, CENTER, 18, W, H);
    expect(p.x).toBeCloseTo(W / 2, 6);
    expect(p.y).toBeCloseTo(H / 2, 6);
  });

  it("puts north above and east to the right", () => {
    const north = projectToView(
      { lat: CENTER.lat + 0.0002, lng: CENTER.lng },
      CENTER, 18, W, H,
    );
    const east = projectToView(
      { lat: CENTER.lat, lng: CENTER.lng + 0.0002 },
      CENTER, 18, W, H,
    );
    expect(north.y).toBeLessThan(H / 2); // SVG y grows downward
    expect(east.x).toBeGreaterThan(W / 2);
  });

  it("shares its origin with tilesForView, which is what aligns the two", () => {
    // The bug this pins: the outline was scaled to fill the box while the
    // tiles sat at their own zoom, so the parcel was drawn across a street
    // it does not touch. Both layers must agree on where a coordinate is.
    const zoom = 18;
    const { tiles } = tilesForView(CENTER, zoom, W, H);
    const p = projectToView(CENTER, CENTER, zoom, W, H);

    // Find the tile containing the centre and check the point falls inside
    // it, using only the tile's own placement.
    const owner = tiles.find(
      (t) =>
        p.x >= t.left && p.x < t.left + TILE_SIZE &&
        p.y >= t.top && p.y < t.top + TILE_SIZE,
    );
    expect(owner).toBeDefined();
  });

  it("renders a parcel at its true size on the ground", () => {
    // ~29 m across, the real Belgrano 1285 lot. At this zoom that has to be
    // a specific number of pixels — not "whatever fills the frame".
    const zoom = 19;
    const spanMeters = 29;
    const dLat = spanMeters / 111_320;
    const a = projectToView(CENTER, CENTER, zoom, W, H);
    const b = projectToView(
      { lat: CENTER.lat - dLat, lng: CENTER.lng },
      CENTER, zoom, W, H,
    );
    const expectedPx = spanMeters / metersPerPixel(CENTER.lat, zoom);
    expect(Math.abs(b.y - a.y)).toBeCloseTo(expectedPx, 0);
  });

  it("leaves room around the lot at the zoom the home picks", () => {
    // PARCEL_VIEW_FACTOR exists so the parcel sits in its block rather than
    // filling the frame edge to edge, which would make it abstract again.
    const spanMeters = 29;
    const zoom = zoomForSpan(CENTER.lat, spanMeters * PARCEL_VIEW_FACTOR, W);
    const widthPx = spanMeters / metersPerPixel(CENTER.lat, zoom);
    expect(widthPx).toBeLessThan(W); // fits
    expect(widthPx).toBeGreaterThan(W * 0.35); // but isn't a speck
  });
});
