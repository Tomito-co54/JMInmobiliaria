import { describe, expect, it } from "vitest";
import { extractRings, getBoundingBox, projectRing } from "./geometry";

describe("extractRings", () => {
  it("handles Polygon", () => {
    const g = { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] };
    expect(extractRings(g)).toHaveLength(1);
  });

  it("handles MultiPolygon (flattens to ring list)", () => {
    const g = {
      type: "MultiPolygon",
      coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 0]]], [[[2, 2], [3, 2], [3, 3], [2, 2]]]],
    };
    expect(extractRings(g)).toHaveLength(2);
  });

  it("returns [] for unknown geometry", () => {
    expect(extractRings({ type: "Point", coordinates: [0, 0] })).toEqual([]);
    expect(extractRings(null)).toEqual([]);
  });
});

describe("getBoundingBox", () => {
  it("computes bbox over all rings", () => {
    const rings = [
      [[0, 0], [10, 0], [10, 5]],
      [[-1, -1], [2, 8]],
    ];
    expect(getBoundingBox(rings)).toEqual({
      minLng: -1, maxLng: 10, minLat: -1, maxLat: 8,
    });
  });

  it("ignores non-finite coordinates", () => {
    const rings = [[[0, 0], [NaN, 5], [3, 2]]];
    expect(getBoundingBox(rings)).toEqual({
      minLng: 0, maxLng: 3, minLat: 0, maxLat: 2,
    });
  });

  it("returns null for empty input", () => {
    expect(getBoundingBox([])).toBeNull();
  });
});

describe("projectRing", () => {
  const bbox = { minLng: -58.4, maxLng: -58.3, minLat: -34.8, maxLat: -34.7 };

  it("maps north→top and south→bottom (lat flip)", () => {
    const pts = projectRing(
      [[-58.4, -34.7], [-58.3, -34.7], [-58.3, -34.8], [-58.4, -34.8]],
      bbox,
      { width: 100, height: 100, padding: 0 },
    );
    // -34.7 (north) should have smaller y than -34.8 (south)
    expect(pts[0].y).toBeLessThan(pts[2].y);
  });

  it("maps west→left and east→right", () => {
    const pts = projectRing(
      [[-58.4, -34.75], [-58.3, -34.75]],
      bbox,
      { width: 100, height: 100, padding: 0 },
    );
    expect(pts[0].x).toBeLessThan(pts[1].x);
  });

  it("centers a degenerate polygon", () => {
    const pts = projectRing(
      [[-58.35, -34.75]],
      { minLng: -58.35, maxLng: -58.35, minLat: -34.75, maxLat: -34.75 },
      { width: 100, height: 100, padding: 10 },
    );
    expect(pts[0].x).toBe(50);
    expect(pts[0].y).toBe(50);
  });
});
