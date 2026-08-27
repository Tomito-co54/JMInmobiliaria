import { describe, it, expect } from "vitest";
import {
  pointToTile,
  metersPerPixel,
  zoomForSpan,
  tilesForView,
  projectToView,
  TILE_SIZE,
  PARCEL_VIEW_FACTOR,
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

  it("builds a real OSM url", () => {
    const { tiles } = tilesForView(LOMAS, 18, 256, 256);
    const t = tiles[0];
    expect(t.url).toBe(`https://tile.openstreetmap.org/${t.z}/${t.x}/${t.y}.png`);
    expect(t.url).not.toContain("{");
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
