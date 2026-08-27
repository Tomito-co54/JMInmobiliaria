import { describe, it, expect } from "vitest";
import {
  countImplausibleSurfaces,
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
  HIGH_SIGNAL_KINDS,
  priceDeltaPct,
  scoreBandDistribution,
  type MarketRow,
} from "./stats";
import { listScoreBands, getScoreBand } from "@/lib/scoring/bands";

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
  it("prefers the declared surface over the cadastral parcel", () => {
    // Reversed on purpose. `surface_arba` is the area of the LAND, which for
    // an apartment is the whole building's lot — a different question from
    // "how big is this property".
    expect(effectiveSurface({ surface_arba: 120, surface_total: 100 })).toEqual({
      value: 100,
      source: "declared",
    });
  });
  it("falls back to the parcel only when nothing was declared", () => {
    expect(effectiveSurface({ surface_arba: 120, surface_total: null })).toEqual({
      value: 120,
      source: "arba",
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
  it("ignores the cadastral parcel even when it's there", () => {
    // The old behaviour divided by the parcel and produced land prices for
    // apartments: a USD 44,900 unit with 61 m² declared sits on a 301 m² lot,
    // which read as 149 USD/m². Across the scraped set the median for
    // departamentos was 487 that way versus 2,024 over declared surface.
    expect(usdPerM2(row({ price_amount: 200000, surface_arba: 200, surface_total: 100 }))).toBe(
      2000,
    );
  });
  it("drops the row rather than answering with a different quantity", () => {
    // No fallback to the parcel: mixing land prices and property prices in
    // one distribution is what made its standard deviation exceed its mean.
    expect(
      usdPerM2(row({ price_amount: 200000, surface_arba: 200, surface_total: null })),
    ).toBeNull();
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
  it("names every edit it knows about", () => {
    // These used to collapse into "other" and get filtered out of the feed
    // entirely. A rewritten ad usually means the seller is repositioning,
    // and a corrected surface moves every price-per-m² that depends on it —
    // both are worth seeing on the changes page.
    expect(classifyChange({ field_changed: "property_type", old_value: "casa", new_value: "ph" })).toBe("type_change");
    expect(classifyChange({ field_changed: "description", old_value: "a", new_value: "b" })).toBe("description_change");
    expect(classifyChange({ field_changed: "surface_total", old_value: "80", new_value: "95" })).toBe("surface_change");
    expect(classifyChange({ field_changed: "surface_covered", old_value: "70", new_value: "72" })).toBe("surface_change");
    expect(classifyChange({ field_changed: "address", old_value: "a", new_value: "b" })).toBe("address_change");
  });

  it("still falls back to other for anything unrecognised", () => {
    expect(classifyChange({ field_changed: "rooms", old_value: "3", new_value: "4" })).toBe("other");
  });

  it("keeps the dashboard's short feed to the high-signal kinds", () => {
    // The fourteen-slot feed can't carry description edits without burying
    // the price moves; the dedicated page filters instead.
    expect(HIGH_SIGNAL_KINDS).toContain("price_drop");
    expect(HIGH_SIGNAL_KINDS).toContain("relisted");
    expect(HIGH_SIGNAL_KINDS).not.toContain("description_change");
    expect(HIGH_SIGNAL_KINDS).not.toContain("other");
  });
  it("priceDeltaPct computes percent drop", () => {
    expect(priceDeltaPct({ field_changed: "price_amount", old_value: "100", new_value: "90" })).toBeCloseTo(-10, 5);
    expect(priceDeltaPct({ field_changed: "is_active", old_value: "true", new_value: "false" })).toBeNull();
  });
});

describe("scoreBandDistribution", () => {
  const bands = listScoreBands();
  const classify = (s: number) => getScoreBand(s).id;

  it("buckets scores into the canonical bands", () => {
    const rows = [
      { quality_score: 10 }, // low (0-19)
      { quality_score: 45 }, // acceptable (36-55)
      { quality_score: 60 }, // good (56-75)
      { quality_score: 67 }, // good
      { quality_score: 98 }, // exceptional (95-100)
    ];
    const d = scoreBandDistribution(rows, bands, classify);
    expect(d.scored).toBe(5);
    expect(d.unscored).toBe(0);
    const byId = Object.fromEntries(d.buckets.map((b) => [b.id, b.count]));
    expect(byId.low).toBe(1);
    expect(byId.acceptable).toBe(1);
    expect(byId.good).toBe(2);
    expect(byId.exceptional).toBe(1);
    expect(d.maxCount).toBe(2);
  });

  it("counts unscored rows separately, not in buckets", () => {
    const rows = [{ quality_score: 60 }, { quality_score: null }, { quality_score: null }];
    const d = scoreBandDistribution(rows, bands, classify);
    expect(d.scored).toBe(1);
    expect(d.unscored).toBe(2);
    expect(d.buckets.reduce((s, b) => s + b.count, 0)).toBe(1);
  });

  it("always returns every band, even empty ones", () => {
    const d = scoreBandDistribution([], bands, classify);
    expect(d.buckets).toHaveLength(bands.length);
    expect(d.maxCount).toBe(0);
    expect(d.scored).toBe(0);
  });

  it("coerces string-numeric scores (PostgREST)", () => {
    const rows = [{ quality_score: "67" as unknown as number }];
    const d = scoreBandDistribution(rows, bands, classify);
    expect(d.scored).toBe(1);
    expect(d.buckets.find((b) => b.id === "good")?.count).toBe(1);
  });
});

describe("implausible surfaces", () => {
  it("excludes a surface too small to be a property", () => {
    // Real row: "Boston al 700", USD 119,900 on a parsed surface of 1 m²,
    // which priced at 119,900 USD/m² and dragged the casa mean far above
    // its median.
    expect(usdPerM2(row({ price_amount: 119900, surface_total: 1 }))).toBeNull();
  });

  it("excludes a surface too large to be real", () => {
    // Real row: "L. N. Alem 555" at 6,000,000 m² — 600 hectares in Lomas de
    // Zamora.
    expect(usdPerM2(row({ price_amount: 540000, surface_total: 6_000_000 }))).toBeNull();
  });

  it("still prices a large but believable lote", () => {
    // The ceiling has to leave room for genuinely big land.
    expect(usdPerM2(row({ price_amount: 500000, surface_total: 5000 }))).toBe(100);
  });

  it("counts the rows it refuses to price, so the exclusion is visible", () => {
    const rows = [
      { surface_total: 1 },
      { surface_total: 6_000_000 },
      { surface_total: 120 },
      { surface_total: null },
      { surface_total: 0 },
    ];
    expect(countImplausibleSurfaces(rows as never)).toBe(2);
  });
});
