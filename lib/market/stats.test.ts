import { describe, it, expect } from "vitest";
import {
  effectiveSurface,
  usdPerM2,
  daysOnMarket,
  median,
  percentile,
  mean,
  stdev,
  summarize,
  distributionByType,
  computeKpis,
  classifyChange,
  priceDeltaPct,
  type MarketRow,
} from "./stats";

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
    lat: -34.7,
    lng: -58.4,
    address: "Calle 1",
    url: "http://x",
    is_active: true,
    first_seen_at: "2026-05-16T00:00:00Z",
    last_seen_at: "2026-05-26T00:00:00Z",
    ...overrides,
  };
}

describe("effectiveSurface", () => {
  it("prefers ARBA surface over declared", () => {
    expect(effectiveSurface({ surface_arba: 120, surface_total: 100 })).toEqual({
      value: 120,
      source: "arba",
    });
  });
  it("falls back to declared when no ARBA", () => {
    expect(effectiveSurface({ surface_arba: null, surface_total: 100 })).toEqual({
      value: 100,
      source: "declared",
    });
  });
  it("returns null when neither is usable", () => {
    expect(effectiveSurface({ surface_arba: 0, surface_total: null })).toEqual({
      value: null,
      source: null,
    });
  });
  it("coerces string-numerics (PostgREST)", () => {
    expect(
      effectiveSurface({ surface_arba: "239.23" as unknown as number, surface_total: null }),
    ).toEqual({ value: 239.23, source: "arba" });
  });
});

describe("usdPerM2", () => {
  it("computes price / surface for USD rows", () => {
    expect(usdPerM2(row({ price_amount: 200000, surface_total: 100 }))).toBe(2000);
  });
  it("uses ARBA surface when present", () => {
    expect(usdPerM2(row({ price_amount: 200000, surface_arba: 200, surface_total: 100 }))).toBe(
      1000,
    );
  });
  it("returns null for non-USD currency", () => {
    expect(usdPerM2(row({ price_currency: "ARS" }))).toBeNull();
  });
  it("returns null without a surface", () => {
    expect(usdPerM2(row({ surface_total: null, surface_arba: null }))).toBeNull();
  });
  it("returns null without a price", () => {
    expect(usdPerM2(row({ price_amount: null }))).toBeNull();
  });
});

describe("daysOnMarket", () => {
  it("computes whole days between first and last seen", () => {
    expect(daysOnMarket({ first_seen_at: "2026-05-16T00:00:00Z", last_seen_at: "2026-05-26T00:00:00Z" })).toBe(10);
  });
  it("is null when a timestamp is missing", () => {
    expect(daysOnMarket({ first_seen_at: null, last_seen_at: "2026-05-26T00:00:00Z" })).toBeNull();
  });
});

describe("median / percentile / mean / stdev", () => {
  it("median odd & even", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
  it("median empty is null", () => {
    expect(median([])).toBeNull();
  });
  it("percentile interpolates", () => {
    expect(percentile([1, 2, 3, 4, 5], 0.5)).toBe(3);
    expect(percentile([0, 10], 0.25)).toBe(2.5);
  });
  it("mean", () => {
    expect(mean([2, 4, 6])).toBe(4);
  });
  it("stdev sample (n-1), null for n<2", () => {
    expect(stdev([2, 4, 6])).toBeCloseTo(2, 5);
    expect(stdev([5])).toBeNull();
  });
});

describe("summarize", () => {
  it("produces a full summary", () => {
    const s = summarize([1000, 2000, 3000]);
    expect(s.n).toBe(3);
    expect(s.median).toBe(2000);
    expect(s.min).toBe(1000);
    expect(s.max).toBe(3000);
  });
  it("empty summary is all null with n=0", () => {
    const s = summarize([]);
    expect(s.n).toBe(0);
    expect(s.median).toBeNull();
  });
});

describe("distributionByType", () => {
  it("groups USD/m² by type and sorts by sample size", () => {
    const rows = [
      row({ property_type: "casa", price_amount: 200000, surface_total: 100 }), // 2000
      row({ property_type: "casa", price_amount: 300000, surface_total: 100 }), // 3000
      row({ property_type: "departamento", price_amount: 100000, surface_total: 100 }), // 1000
      row({ property_type: "casa", price_currency: "ARS" }), // excluded
    ];
    const { overall, byType } = distributionByType(rows);
    expect(overall.n).toBe(3);
    expect(byType[0].type).toBe("casa");
    expect(byType[0].summary.n).toBe(2);
    expect(byType[0].summary.median).toBe(2500);
    expect(byType[1].type).toBe("departamento");
  });
});

describe("computeKpis", () => {
  it("counts coverage", () => {
    const rows = [
      row({ source: "zonaprop", is_active: true }),
      row({ source: "trezza", is_active: false, price_amount: null, surface_total: null, lat: null }),
    ];
    const k = computeKpis(rows);
    expect(k.total).toBe(2);
    expect(k.active).toBe(1);
    expect(k.inactive).toBe(1);
    expect(k.bySource).toEqual({ zonaprop: 1, trezza: 1 });
    expect(k.withPrice).toBe(1);
    expect(k.withUsdPerM2).toBe(1);
    expect(k.geocoded).toBe(1);
  });
});

describe("classifyChange / priceDeltaPct", () => {
  it("detects price drop and rise", () => {
    expect(classifyChange({ field_changed: "price_amount", old_value: "100", new_value: "90" })).toBe("price_drop");
    expect(classifyChange({ field_changed: "price_amount", old_value: "100", new_value: "110" })).toBe("price_rise");
  });
  it("detects delist / relist", () => {
    expect(classifyChange({ field_changed: "is_active", old_value: "true", new_value: "false" })).toBe("delisted");
    expect(classifyChange({ field_changed: "is_active", old_value: "false", new_value: "true" })).toBe("relisted");
  });
  it("type change and other", () => {
    expect(classifyChange({ field_changed: "property_type", old_value: "casa", new_value: "ph" })).toBe("type_change");
    expect(classifyChange({ field_changed: "description", old_value: "a", new_value: "b" })).toBe("other");
  });
  it("priceDeltaPct computes percent drop", () => {
    expect(priceDeltaPct({ field_changed: "price_amount", old_value: "100", new_value: "90" })).toBeCloseTo(-10, 5);
    expect(priceDeltaPct({ field_changed: "is_active", old_value: "true", new_value: "false" })).toBeNull();
  });
});
