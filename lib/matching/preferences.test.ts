import { describe, it, expect } from "vitest";
import {
  EMPTY_MATCH_PREFERENCES,
  MATCH_PROPERTY_TYPES,
  PRICE_MAX_CEILING,
  hasAnyPreference,
  parseMatchPreferences,
  toSearchProfile,
  type MatchPreferences,
} from "./preferences";
import { computeMatchScore } from "./match";
import type { PropertyForMatching } from "./types";

const prefs = (over: Partial<MatchPreferences> = {}): MatchPreferences => ({
  ...EMPTY_MATCH_PREFERENCES,
  ...over,
});

/** A Belgrano 1287 two-room unit: 40 m² on a 239.23 m² building parcel. */
const UNIT: PropertyForMatching = {
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
};

describe("hasAnyPreference", () => {
  it("is false for an untouched visitor", () => {
    expect(hasAnyPreference(EMPTY_MATCH_PREFERENCES)).toBe(false);
  });

  it.each([
    ["zona", prefs({ partidos: ["Lanús"] })],
    ["precio", prefs({ priceMax: 90_000 })],
    ["ambientes", prefs({ roomsMin: 2 })],
    ["tipo", prefs({ propertyTypes: ["casa"] })],
  ])("is true once %s is answered", (_label, p) => {
    expect(hasAnyPreference(p)).toBe(true);
  });
});

describe("toSearchProfile", () => {
  it("treats every chosen partido as preferred", () => {
    const profile = toSearchProfile(prefs({ partidos: ["Lanús", "Quilmes"] }));
    expect(profile.zones).toEqual([
      { partido: "Lanús", priority: "preferido" },
      { partido: "Quilmes", priority: "preferido" },
    ]);
  });

  it("leaves unasked criteria null so they score zero confidence", () => {
    // This is what makes a four-question form honest: a visitor who answered
    // only the zone gets a match computed on the zone, not one diluted by six
    // criteria they never expressed.
    const breakdown = computeMatchScore(
      UNIT,
      toSearchProfile(prefs({ partidos: ["Lomas de Zamora"] })),
    );
    expect(breakdown.subscores.surface.confidence).toBe(0);
    expect(breakdown.subscores.must_haves.confidence).toBe(0);
    expect(breakdown.subscores.zone.confidence).toBeGreaterThan(0);
    // Operation is the one unasked criterion the algorithm still counts, at
    // 0.3 — it reads a missing preference as "venta or alquiler both fine"
    // rather than as unknown. Left as is: it is shared with the logged-in
    // path and the public catalog is sale-only, so it can only ever agree.
    expect(breakdown.subscores.operation.confidence).toBeLessThanOrEqual(0.3);
    // The point of the whole arrangement: the match is renormalized over what
    // was actually asked instead of averaging in silent defaults.
    expect(breakdown.effective_weight_ratio).toBeLessThan(1);
  });

  it("scores a fitting property above a mismatched one", () => {
    const p = prefs({
      partidos: ["Lomas de Zamora"],
      priceMax: 90_000,
      roomsMin: 2,
      propertyTypes: ["departamento"],
    });
    const fits = computeMatchScore(UNIT, toSearchProfile(p));
    const elsewhere = computeMatchScore(
      { ...UNIT, partido: "Ezeiza", property_type: "casa", price_amount: 300_000 },
      toSearchProfile(p),
    );
    expect(fits.score).not.toBeNull();
    expect(elsewhere.score).not.toBeNull();
    expect(fits.score as number).toBeGreaterThan(elsewhere.score as number);
  });
});

describe("parseMatchPreferences", () => {
  it("survives anything sessionStorage can hand back", () => {
    for (const junk of [null, undefined, 7, "x", [], { partidos: "Lanús" }]) {
      expect(parseMatchPreferences(junk)).toEqual(EMPTY_MATCH_PREFERENCES);
    }
  });

  it("drops partidos it does not recognise", () => {
    // A stored value outlives a rename of the partido list, and it can be
    // hand-edited. Anything unrecognised is dropped rather than handed to the
    // matcher.
    const out = parseMatchPreferences({
      partidos: ["Lanús", "Rosario", 42],
    });
    expect(out.partidos).toEqual(["Lanús"]);
  });

  it("dedupes repeated values", () => {
    expect(
      parseMatchPreferences({ partidos: ["Lanús", "Lanús"] }).partidos,
    ).toEqual(["Lanús"]);
  });

  it("rejects prices outside what the control can produce", () => {
    expect(parseMatchPreferences({ priceMax: 5 }).priceMax).toBeNull();
    expect(parseMatchPreferences({ priceMax: 9_000_000 }).priceMax).toBeNull();
    expect(parseMatchPreferences({ priceMax: Number.NaN }).priceMax).toBeNull();
    expect(parseMatchPreferences({ priceMax: 90_000 }).priceMax).toBe(90_000);
  });

  it("keeps only known property types", () => {
    const out = parseMatchPreferences({
      propertyTypes: ["departamento", "castillo"],
    });
    expect(out.propertyTypes).toEqual(["departamento"]);
    expect(MATCH_PROPERTY_TYPES).toContain("departamento");
  });

  it("round-trips what the form produces", () => {
    const p = prefs({
      partidos: ["Lomas de Zamora"],
      priceMax: PRICE_MAX_CEILING - 5_000,
      roomsMin: 3,
      propertyTypes: ["ph"],
    });
    expect(parseMatchPreferences(JSON.parse(JSON.stringify(p)))).toEqual(p);
  });
});

describe("the surface a buyer is matched against", () => {
  it("uses the unit, not the building's parcel", () => {
    // The 40 m² units at Belgrano 1287 sit on a 239.23 m² parcel. Preferring
    // the parcel told a buyer asking for 120 m² that a two-room apartment
    // cleared their minimum.
    const wants120 = {
      ...toSearchProfile(prefs()),
      surface_min: 120,
    };
    const sub = computeMatchScore(UNIT, wants120).subscores.surface;
    expect(sub.reason).toContain("40");
    expect(sub.reason).not.toContain("239");
    expect(sub.verdict).toBe("unfulfilled");
  });

  it("still falls back to the parcel when nothing was declared", () => {
    // A lote is the case where the cadastral area really is the property.
    const lote = { ...UNIT, surface_total: null, surface_arba: 300 };
    const wants120 = { ...toSearchProfile(prefs()), surface_min: 120 };
    const sub = computeMatchScore(lote, wants120).subscores.surface;
    expect(sub.reason).toContain("300");
    expect(sub.verdict).toBe("fulfilled");
  });
});
