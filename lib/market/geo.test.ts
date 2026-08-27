import { describe, it, expect } from "vitest";
import {
  boundsFromCorners,
  isInside,
  boundsOfPoints,
  robustBoundsOfPoints,
  boundsDiagonalMeters,
  summarizeArea,
  type Bounds,
} from "./geo";
import type { MarketRow } from "./stats";

/** Roughly the block around Belgrano 1285, Lomas de Zamora. */
const AREA: Bounds = {
  north: -34.745,
  south: -34.748,
  east: -58.39,
  west: -58.394,
};

function row(overrides: Partial<MarketRow>): MarketRow {
  return {
    id: "x",
    source: "zonaprop",
    partido: "Lomas de Zamora",
    property_type: "casa",
    operation_type: "venta",
    price_amount: 100000,
    price_currency: "USD",
    surface_total: 100,
    surface_arba: null,
    rooms: 3,
    quality_score: 60,
    lat: -34.746,
    lng: -58.392,
    address: "Calle 1",
    url: null,
    is_active: true,
    first_seen_at: "2026-05-01T00:00:00Z",
    last_seen_at: "2026-05-31T00:00:00Z",
    ...overrides,
  };
}

describe("boundsFromCorners", () => {
  it("sorts the corners however the drag went", () => {
    // Dragging up-left has to produce the same rectangle as down-right.
    const downRight = boundsFromCorners(
      { lat: -34.748, lng: -58.394 },
      { lat: -34.745, lng: -58.39 },
    );
    const upLeft = boundsFromCorners(
      { lat: -34.745, lng: -58.39 },
      { lat: -34.748, lng: -58.394 },
    );
    expect(downRight).toEqual(upLeft);
    expect(downRight.north).toBeGreaterThan(downRight.south);
    expect(downRight.east).toBeGreaterThan(downRight.west);
  });
});

describe("isInside", () => {
  it("accepts a point in the middle", () => {
    expect(isInside({ lat: -34.746, lng: -58.392 }, AREA)).toBe(true);
  });

  it("rejects points outside on each edge", () => {
    expect(isInside({ lat: -34.74, lng: -58.392 }, AREA)).toBe(false); // north
    expect(isInside({ lat: -34.75, lng: -58.392 }, AREA)).toBe(false); // south
    expect(isInside({ lat: -34.746, lng: -58.38 }, AREA)).toBe(false); // east
    expect(isInside({ lat: -34.746, lng: -58.4 }, AREA)).toBe(false); // west
  });

  it("counts a point exactly on the edge as inside", () => {
    // Exclusive edges would silently drop listings on the boundary of a
    // selection, which reads as the map losing pins it just showed.
    expect(isInside({ lat: AREA.north, lng: AREA.east }, AREA)).toBe(true);
    expect(isInside({ lat: AREA.south, lng: AREA.west }, AREA)).toBe(true);
  });
});

describe("boundsOfPoints", () => {
  it("wraps every point", () => {
    const b = boundsOfPoints([
      { lat: -34.746, lng: -58.392 },
      { lat: -34.75, lng: -58.4 },
      { lat: -34.74, lng: -58.38 },
    ]);
    expect(b).toEqual({ north: -34.74, south: -34.75, east: -58.38, west: -58.4 });
  });

  it("handles a single point as a degenerate rectangle", () => {
    const b = boundsOfPoints([{ lat: -34.746, lng: -58.392 }]);
    expect(b).toEqual({ north: -34.746, south: -34.746, east: -58.392, west: -58.392 });
  });

  it("is null with nothing to wrap", () => {
    expect(boundsOfPoints([])).toBeNull();
  });
});

describe("boundsDiagonalMeters", () => {
  it("measures a neighbourhood-sized box in hundreds of metres", () => {
    const d = boundsDiagonalMeters(AREA);
    expect(d).toBeGreaterThan(300);
    expect(d).toBeLessThan(1000);
  });

  it("gives ~0 for a click that produced no drag", () => {
    // This is what the guard against accidental clicks reads.
    const point = { north: -34.746, south: -34.746, east: -58.392, west: -58.392 };
    expect(boundsDiagonalMeters(point)).toBeCloseTo(0, 5);
  });
});

describe("summarizeArea", () => {
  it("reports medians, not averages", () => {
    // One mansion among ordinary houses. The average would read ~2.575
    // USD/m² and describe nothing on the block; the median stays at 1.000.
    const rows = [
      row({ price_amount: 100000, surface_total: 100 }), // 1.000
      row({ price_amount: 100000, surface_total: 100 }), // 1.000
      row({ price_amount: 900000, surface_total: 100 }), // 9.000
    ];
    expect(summarizeArea(rows).medianUsdPerM2).toBe(1000);
  });

  it("counts what it could price separately from what it found", () => {
    const rows = [
      row({}),
      row({ surface_total: null }), // no surface, can't be priced
      row({ price_currency: "ARS" }), // not USD
    ];
    const s = summarizeArea(rows);
    expect(s.count).toBe(3);
    expect(s.pricedCount).toBe(1);
  });

  it("keeps the price range to USD, since the set mixes currencies", () => {
    const rows = [
      row({ price_amount: 80000, price_currency: "USD" }),
      row({ price_amount: 120000, price_currency: "USD" }),
      row({ price_amount: 95000000, price_currency: "ARS" }),
    ];
    const s = summarizeArea(rows);
    expect(s.minPrice).toBe(80000);
    expect(s.maxPrice).toBe(120000);
  });

  it("separates live listings from ones already gone", () => {
    const s = summarizeArea([row({}), row({ is_active: false })]);
    expect(s.count).toBe(2);
    expect(s.activeCount).toBe(1);
  });

  it("returns an honest empty summary for an empty area", () => {
    const s = summarizeArea([]);
    expect(s.count).toBe(0);
    expect(s.medianUsdPerM2).toBeNull();
    expect(s.minPrice).toBeNull();
  });
});

describe("robustBoundsOfPoints", () => {
  /** 100 points tightly clustered, plus one far away. */
  function clusterWithOutlier() {
    const pts = Array.from({ length: 100 }, (_, i) => ({
      lat: -34.75 + (i % 10) * 0.0005,
      lng: -58.4 + Math.floor(i / 10) * 0.0005,
    }));
    pts.push({ lat: -34.66, lng: -58.25 }); // Avellaneda, in the real data
    return pts;
  }

  it("ignores the outlier that a plain bounding box would obey", () => {
    const pts = clusterWithOutlier();
    const plain = boundsOfPoints(pts)!;
    const robust = robustBoundsOfPoints(pts)!;
    // The plain box stretches to the stray point; the robust one stays on
    // the cluster, which is what the opening view should frame.
    expect(plain.north).toBeCloseTo(-34.66, 2);
    expect(robust.north).toBeLessThan(-34.7);
    expect(robust.east).toBeLessThan(-58.3);
  });

  it("falls back to the plain box on small samples", () => {
    // Trimming percentiles off a handful of points would throw away real
    // data rather than noise.
    const few = [
      { lat: -34.75, lng: -58.4 },
      { lat: -34.66, lng: -58.25 },
    ];
    expect(robustBoundsOfPoints(few)).toEqual(boundsOfPoints(few));
  });

  it("is null with no points", () => {
    expect(robustBoundsOfPoints([])).toBeNull();
  });
});
