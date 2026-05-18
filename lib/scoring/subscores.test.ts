import { describe, expect, it } from "vitest";
import {
  arbaCoherenceSubScore,
  documentationSubScore,
  listingQualitySubScore,
  priceVsComparablesSubScore,
  timeOnMarketSubScore,
} from "./subscores";
import { makeInput, makeProperty, priceDropEvent } from "./test-fixtures";

// ---------------------------------------------------------------------------
// listing_quality
// ---------------------------------------------------------------------------

describe("listingQualitySubScore", () => {
  it("scores a complete listing high", () => {
    const input = makeInput();
    const s = listingQualitySubScore(input);
    expect(s.confidence).toBe(1.0);
    // desc 30 (long) + photos 20 (2 photos) + fields 25 (5/5)
    expect(s.value).toBe(75);
  });

  it("penalizes 'consultar precio' with no price", () => {
    const input = makeInput({
      property: makeProperty({
        description: "Consultar precio. Casa amplia. " + "x".repeat(800),
        price_amount: null,
      }),
    });
    const s = listingQualitySubScore(input);
    // desc 30 + photos 20 + fields 20 (no price doesn't change rooms/etc) - 20 penalty
    expect(s.value).toBeLessThan(70);
    expect(s.reason).toContain("precio oculto");
  });

  it("scores zero-ish for empty listing", () => {
    const input = makeInput({
      property: makeProperty({
        description: null,
        photos: [],
        rooms: null,
        bedrooms: null,
        bathrooms: null,
        surface_total: null,
        garages: null,
      }),
    });
    const s = listingQualitySubScore(input);
    expect(s.value).toBe(0);
    expect(s.confidence).toBe(1.0);
  });

  it("gives partial credit for 1 photo", () => {
    const input = makeInput({
      property: makeProperty({ photos: ["one.jpg"] }),
    });
    const s = listingQualitySubScore(input);
    // 30 + 10 + 25 = 65
    expect(s.value).toBe(65);
  });
});

// ---------------------------------------------------------------------------
// documentation
// ---------------------------------------------------------------------------

describe("documentationSubScore", () => {
  it("scores 100 when every ARBA component is present and match is intersects", () => {
    const s = documentationSubScore(makeInput());
    expect(s.value).toBe(100);
    expect(s.confidence).toBe(1.0);
  });

  it("does not penalize for missing arba_match_exact when there's no lookup", () => {
    const input = makeInput({
      arbaLookup: null,
      property: makeProperty({
        partida: "12345",
        nomenclatura_catastral: "070-01-001",
        surface_arba: 100,
        lat: -34.7,
        lng: -58.4,
      }),
    });
    const s = documentationSubScore(input);
    // 4/4 applicable components present (the 5th, arba_match_exact, doesn't apply)
    expect(s.value).toBe(100);
  });

  it("scores low when nothing ARBA is present", () => {
    const input = makeInput({
      arbaLookup: null,
      property: makeProperty({
        partida: null,
        nomenclatura_catastral: null,
        surface_arba: null,
        lat: null,
        lng: null,
      }),
    });
    const s = documentationSubScore(input);
    expect(s.value).toBe(0);
  });

  it("scores partial when only coords + partida present (no nomenclatura/surface/match)", () => {
    const input = makeInput({
      arbaLookup: { matchStrategy: "dwithin" },
      property: makeProperty({
        partida: "12345",
        nomenclatura_catastral: null,
        surface_arba: null,
        lat: -34.7,
        lng: -58.4,
      }),
    });
    const s = documentationSubScore(input);
    // applicable: 30+20+20+15+15 = 100. Present: 30 (partida) + 15 (geocoded) = 45.
    expect(s.value).toBe(45);
  });
});

// ---------------------------------------------------------------------------
// arba_coherence
// ---------------------------------------------------------------------------

describe("arbaCoherenceSubScore", () => {
  it("scores 100 when declared and ARBA match within 10%", () => {
    const s = arbaCoherenceSubScore(
      makeInput({ property: makeProperty({ surface_total: 100, surface_arba: 98 }) }),
    );
    expect(s.value).toBe(100);
    expect(s.confidence).toBe(1.0);
  });

  it("scores 80 with 10-25% diff", () => {
    const s = arbaCoherenceSubScore(
      makeInput({ property: makeProperty({ surface_total: 120, surface_arba: 100 }) }),
    );
    expect(s.value).toBe(80);
  });

  it("scores 50 with 25-50% diff", () => {
    const s = arbaCoherenceSubScore(
      makeInput({ property: makeProperty({ surface_total: 140, surface_arba: 100 }) }),
    );
    expect(s.value).toBe(50);
  });

  it("scores 0 when massively off", () => {
    const s = arbaCoherenceSubScore(
      makeInput({ property: makeProperty({ surface_total: 500, surface_arba: 100 }) }),
    );
    expect(s.value).toBe(0);
  });

  it("returns confidence=0 (skip) when both surfaces missing", () => {
    const s = arbaCoherenceSubScore(
      makeInput({
        property: makeProperty({
          surface_total: null,
          surface_covered: null,
          surface_arba: null,
        }),
      }),
    );
    expect(s.confidence).toBe(0);
  });

  it("returns low confidence when only one side present", () => {
    const s = arbaCoherenceSubScore(
      makeInput({
        property: makeProperty({
          surface_total: null,
          surface_covered: null,
          surface_arba: 100,
        }),
      }),
    );
    expect(s.confidence).toBe(0.3);
    expect(s.value).toBe(60);
  });

  it("falls back to surface_covered when surface_total is missing", () => {
    const s = arbaCoherenceSubScore(
      makeInput({
        property: makeProperty({
          surface_total: null,
          surface_covered: 100,
          surface_arba: 98,
        }),
      }),
    );
    expect(s.confidence).toBe(1.0);
    expect(s.value).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// time_on_market
// ---------------------------------------------------------------------------

describe("timeOnMarketSubScore", () => {
  function nDaysAgo(n: number): string {
    return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
  }

  it("scores 100 for a fresh listing but with low confidence", () => {
    const s = timeOnMarketSubScore(
      makeInput({
        property: makeProperty({ first_seen_at: nDaysAgo(3) }),
      }),
    );
    expect(s.value).toBe(100);
    expect(s.confidence).toBe(0.3);
    expect(s.reason).toContain("temprano");
  });

  it("scores 100 at 30 days with full confidence", () => {
    const s = timeOnMarketSubScore(
      makeInput({
        property: makeProperty({ first_seen_at: nDaysAgo(30) }),
      }),
    );
    expect(s.value).toBe(100);
    expect(s.confidence).toBe(1.0);
  });

  it("decays toward 0 at 180+ days", () => {
    const s = timeOnMarketSubScore(
      makeInput({
        property: makeProperty({ first_seen_at: nDaysAgo(180) }),
      }),
    );
    expect(s.value).toBe(0);
    expect(s.confidence).toBe(1.0);
  });

  it("adds +10 bonus for a recent price drop on a stuck listing", () => {
    const s = timeOnMarketSubScore(
      makeInput({
        property: makeProperty({ first_seen_at: nDaysAgo(100) }),
        history: [priceDropEvent(15, 250000, 220000)],
      }),
    );
    // Base: 100 * (1 - 70/150) = 53. +10 bonus → 63.
    expect(s.value).toBeGreaterThan(60);
    expect(s.value).toBeLessThan(70);
    expect(s.reason).toContain("price-drop");
  });

  it("returns confidence=0 when first_seen_at is missing", () => {
    const s = timeOnMarketSubScore(
      makeInput({
        property: makeProperty({ first_seen_at: null }),
      }),
    );
    expect(s.confidence).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// price_vs_comparables
// ---------------------------------------------------------------------------

describe("priceVsComparablesSubScore", () => {
  it("scores 50 when matching the median exactly", () => {
    const input = makeInput({
      property: makeProperty({ price_amount: 200000, surface_arba: 100 }),
      comparableStats: { medianPricePerM2Usd: 2000, sampleSize: 12 },
    });
    const s = priceVsComparablesSubScore(input);
    expect(s.value).toBe(50);
    expect(s.confidence).toBe(1.0);
  });

  it("scores 100 when 25% cheaper than median", () => {
    const input = makeInput({
      property: makeProperty({ price_amount: 150000, surface_arba: 100 }),
      comparableStats: { medianPricePerM2Usd: 2000, sampleSize: 12 },
    });
    const s = priceVsComparablesSubScore(input);
    expect(s.value).toBe(100);
  });

  it("scores 0 when 50%+ above median", () => {
    const input = makeInput({
      property: makeProperty({ price_amount: 300000, surface_arba: 100 }),
      comparableStats: { medianPricePerM2Usd: 2000, sampleSize: 12 },
    });
    const s = priceVsComparablesSubScore(input);
    expect(s.value).toBe(0);
  });

  it("uses confidence 0.5 with small sample (5-9)", () => {
    const input = makeInput({
      comparableStats: { medianPricePerM2Usd: 2000, sampleSize: 6 },
    });
    const s = priceVsComparablesSubScore(input);
    expect(s.confidence).toBe(0.5);
  });

  it("skips (confidence 0) with sample <5", () => {
    const input = makeInput({
      comparableStats: { medianPricePerM2Usd: null, sampleSize: 3 },
    });
    const s = priceVsComparablesSubScore(input);
    expect(s.confidence).toBe(0);
    expect(s.reason).toContain("insuficiente");
  });

  it("skips when price is in ARS", () => {
    const input = makeInput({
      property: makeProperty({ price_currency: "ARS" }),
    });
    const s = priceVsComparablesSubScore(input);
    expect(s.confidence).toBe(0);
  });

  it("skips when surface is missing", () => {
    const input = makeInput({
      property: makeProperty({ surface_arba: null, surface_total: null }),
    });
    const s = priceVsComparablesSubScore(input);
    expect(s.confidence).toBe(0);
  });
});
