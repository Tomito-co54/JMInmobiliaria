import { describe, it, expect } from "vitest";
import {
  pointToTile,
  metersPerPixel,
  zoomForSpan,
  tilesForView,
  TILE_SIZE,
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
