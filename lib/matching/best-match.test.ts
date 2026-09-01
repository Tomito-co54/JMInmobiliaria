import { describe, it, expect } from "vitest";
import { bestMatch } from "./best-match";
import { EMPTY_MATCH_PREFERENCES, type MatchPreferences } from "./preferences";
import type { MatchableProperty } from "./types";

const prefs = (over: Partial<MatchPreferences> = {}): MatchPreferences => ({
  ...EMPTY_MATCH_PREFERENCES,
  ...over,
});

/** Belgrano 1287 1°A — 40 m² on the building's 239.23 m² parcel. */
const UNIT_40: MatchableProperty = {
  id: "unit-40",
  address: "Belgrano 1287 1°A",
  partido: "Lomas de Zamora",
  property_type: "departamento",
  operation_type: "venta",
  price_amount: 80_000,
  price_currency: "USD",
  rooms: 2,
  bedrooms: 1,
  surface_total: 40,
  surface_arba: 239.23,
  garages: 0,
  description: "Dos ambientes a estrenar en Banfield.",
  year_built: 2026,
};

/** 2°A — the same plan with a 40 m² terrace on top, and dearer. */
const UNIT_80: MatchableProperty = {
  ...UNIT_40,
  id: "unit-80",
  address: "Belgrano 1287 2°A",
  price_amount: 96_000,
  surface_total: 80,
};

const CATALOG = [UNIT_40, UNIT_80];

describe("bestMatch", () => {
  it("says nothing when the visitor has expressed nothing", () => {
    // Not "everything matches": with no criteria the sub-scores renormalize
    // over an empty set, so any number would be about nothing.
    expect(bestMatch(CATALOG, EMPTY_MATCH_PREFERENCES)).toBeNull();
  });

  it("says nothing when the catalog is empty", () => {
    expect(bestMatch([], prefs({ roomsMin: 2 }))).toBeNull();
  });

  it("still says nothing for an empty catalog and empty preferences", () => {
    expect(bestMatch([], EMPTY_MATCH_PREFERENCES)).toBeNull();
  });

  it("returns the highest-scoring listing, not the first", () => {
    // 80 m² asked for: only the terrace unit satisfies it, and it is second
    // in the catalog — so a function returning the first scorable row passes
    // every other test here and fails this one.
    const wanted = prefs({ surfaceMin: 80, partidos: ["Lomas de Zamora"] });

    expect(bestMatch(CATALOG, wanted)?.property.id).toBe("unit-80");
    expect(bestMatch([...CATALOG].reverse(), wanted)?.property.id).toBe(
      "unit-80",
    );
  });

  it("says nothing when too little was expressed to be worth a number", () => {
    // A minimum surface on its own carries 10 of the 100 points of criteria
    // weight, under the matcher's confidence floor. That is the matcher's
    // rule, not this function's, and it reaches the visitor here: the header
    // shows the neutral prompt instead of a number built on one answer.
    expect(bestMatch(CATALOG, prefs({ surfaceMin: 80 }))).toBeNull();
  });

  it("carries the score alongside the property", () => {
    const winner = bestMatch(CATALOG, prefs({ partidos: ["Lomas de Zamora"] }));
    expect(winner).not.toBeNull();
    expect(winner!.score).toBeGreaterThan(0);
    expect(winner!.score).toBeLessThanOrEqual(100);
  });

  it("scores a budget the cheaper unit fits above one it does not", () => {
    const winner = bestMatch(CATALOG, prefs({ priceMax: 85_000 }));
    expect(winner?.property.id).toBe("unit-40");
  });
});
