import { describe, it, expect } from "vitest";
import {
  AGE_MAX_OPTIONS,
  EMPTY_MATCH_PREFERENCES,
  MATCH_PROPERTY_TYPES,
  PRICE_MAX_CEILING,
  SURFACE_MIN_CEILING,
  hasAnyPreference,
  parseMatchPreferences,
  toSearchProfile,
  type MatchPreferences,
} from "./preferences";
import { buildingAgeYears, computeMatchScore } from "./match";
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
  year_built: 2025,
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
    ["superficie", prefs({ surfaceMin: 60 })],
    ["antigüedad", prefs({ maxAgeYears: 10 })],
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

  it("rejects surfaces outside what the control can produce", () => {
    expect(parseMatchPreferences({ surfaceMin: 1 }).surfaceMin).toBeNull();
    expect(parseMatchPreferences({ surfaceMin: 99_999 }).surfaceMin).toBeNull();
    expect(parseMatchPreferences({ surfaceMin: 60 }).surfaceMin).toBe(60);
  });

  it("keeps only the age buckets the chips offer", () => {
    // Not a range check: the control is four chips, so 17 never came from our
    // UI and scoring it would invent a criterion the visitor never expressed.
    expect(parseMatchPreferences({ maxAgeYears: 17 }).maxAgeYears).toBeNull();
    expect(parseMatchPreferences({ maxAgeYears: 0 }).maxAgeYears).toBe(0);
    expect(parseMatchPreferences({ maxAgeYears: 30 }).maxAgeYears).toBe(30);
    expect(AGE_MAX_OPTIONS).toContain(30);
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
      surfaceMin: SURFACE_MIN_CEILING,
      maxAgeYears: 10,
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

describe("antigüedad de la construcción", () => {
  const year = new Date().getFullYear();

  it("counts from the year built, not from when the ad went up", () => {
    expect(buildingAgeYears(year - 30)).toBe(30);
    expect(buildingAgeYears(null)).toBeNull();
  });

  it("reads a property sold before it is finished as brand new", () => {
    // "En pozo" carries a year in the future. A negative age would sort and
    // read as nonsense; 0 is the answer the buyer actually wants.
    expect(buildingAgeYears(year + 2)).toBe(0);
  });

  it("rewards a new build for a buyer who asked for a estrenar", () => {
    const p = toSearchProfile(prefs({ maxAgeYears: 0 }));
    const sub = computeMatchScore({ ...UNIT, year_built: year }, p).subscores.age;
    expect(sub.value).toBe(100);
    expect(sub.verdict).toBe("fulfilled");
    expect(sub.reason).toContain("a estrenar");
  });

  it("grades in absolute years, so 'a estrenar' stays scorable", () => {
    // A ratio would divide by a max of 0 and make every property infinitely
    // over the limit — exactly where buyers are most specific.
    const p = toSearchProfile(prefs({ maxAgeYears: 0 }));
    const near = computeMatchScore({ ...UNIT, year_built: year - 3 }, p).subscores.age;
    const far = computeMatchScore({ ...UNIT, year_built: year - 60 }, p).subscores.age;
    expect(near.value).toBeGreaterThan(far.value);
    expect(Number.isFinite(near.value)).toBe(true);
  });

  it("does not punish a property whose age nobody knows", () => {
    // Null is the norm for scraped rows — the source only publishes antigüedad
    // on the individual listing page. Scoring the unknown as "probably old"
    // would invent the very number the buyer is asking about.
    const p = toSearchProfile(prefs({ maxAgeYears: 10 }));
    const sub = computeMatchScore({ ...UNIT, year_built: null }, p).subscores.age;
    expect(sub.confidence).toBe(0);
  });

  it("stays out of the maths when the buyer did not ask", () => {
    const p = toSearchProfile(prefs({ partidos: ["Lomas de Zamora"] }));
    expect(computeMatchScore(UNIT, p).subscores.age.confidence).toBe(0);
  });

  it("ranks a newer building above an older one for the same buyer", () => {
    const p = toSearchProfile(
      prefs({ partidos: ["Lomas de Zamora"], propertyTypes: ["departamento"], maxAgeYears: 10 }),
    );
    const nueva = computeMatchScore({ ...UNIT, year_built: year - 2 }, p).score;
    const vieja = computeMatchScore({ ...UNIT, year_built: year - 70 }, p).score;
    expect(nueva).not.toBeNull();
    expect(vieja).not.toBeNull();
    expect(nueva as number).toBeGreaterThan(vieja as number);
  });
});

describe("superficie como criterio del visitante", () => {
  it("ranks a bigger unit above a smaller one for the same minimum", () => {
    const p = toSearchProfile(
      prefs({ partidos: ["Lomas de Zamora"], surfaceMin: 80 }),
    );
    const grande = computeMatchScore({ ...UNIT, surface_total: 90 }, p).score;
    const chica = computeMatchScore({ ...UNIT, surface_total: 35 }, p).score;
    expect(grande as number).toBeGreaterThan(chica as number);
  });

  it("measures the unit even when a parcel figure is present", () => {
    // The whole reason this criterion was left out of the first version: the
    // 40 m2 units at Belgrano 1287 sit on a 239 m2 parcel.
    const p = toSearchProfile(prefs({ surfaceMin: 120 }));
    const sub = computeMatchScore(UNIT, p).subscores.surface;
    expect(sub.reason).toContain("40");
    expect(sub.reason).not.toContain("239");
  });
});
