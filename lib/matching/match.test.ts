import { describe, expect, it } from "vitest";
import { computeMatchScore } from "./match";
import { getMatchBand } from "./bands";
import { propertySatisfiesMustHave, normalizeTag } from "./must-haves";
import type {
  PropertyForMatching,
  SearchProfileForMatching,
} from "./types";

function makeProperty(overrides: Partial<PropertyForMatching> = {}): PropertyForMatching {
  return {
    partido: "Lomas de Zamora",
    property_type: "casa",
    operation_type: "venta",
    price_amount: 180000,
    price_currency: "USD",
    rooms: 4,
    bedrooms: 3,
    surface_total: 120,
    surface_arba: 118,
    garages: 1,
    description: "Casa amplia con cochera y patio en barrio tranquilo.",
    ...overrides,
  };
}

function makeProfile(overrides: Partial<SearchProfileForMatching> = {}): SearchProfileForMatching {
  return {
    id: "profile-1",
    name: "Mi búsqueda",
    zones: [{ partido: "Lomas de Zamora", priority: "preferido" }],
    price_min: 100000,
    price_max: 200000,
    price_currency: "USD",
    property_types: ["casa"],
    operation_type: "venta",
    rooms_min: 3,
    surface_min: 100,
    must_haves: ["cochera", "patio"],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// computeMatchScore
// ---------------------------------------------------------------------------

describe("computeMatchScore — happy path", () => {
  it("returns a perfect or near-perfect match when everything aligns", () => {
    const out = computeMatchScore(makeProperty(), makeProfile());
    expect(out.score).not.toBeNull();
    expect(out.score!).toBeGreaterThanOrEqual(95);
    expect(out.insufficient_data).toBe(false);
  });

  it("each of the 7 sub-scores is present", () => {
    const out = computeMatchScore(makeProperty(), makeProfile());
    expect(Object.keys(out.subscores).sort()).toEqual(
      ["zone", "price", "type", "operation", "rooms", "surface", "must_haves"].sort(),
    );
  });
});

describe("zone sub-score", () => {
  it("scores 100 for a preferido zone", () => {
    const out = computeMatchScore(makeProperty({ partido: "Lomas de Zamora" }), makeProfile());
    expect(out.subscores.zone.value).toBe(100);
    expect(out.subscores.zone.verdict).toBe("fulfilled");
  });

  it("scores 70 for an aceptable zone", () => {
    const out = computeMatchScore(
      makeProperty({ partido: "Banfield" }),
      makeProfile({
        zones: [
          { partido: "Lomas de Zamora", priority: "preferido" },
          { partido: "Banfield", priority: "aceptable" },
        ],
      }),
    );
    expect(out.subscores.zone.value).toBe(70);
  });

  it("scores 10 for a descarte zone (not zero per design)", () => {
    const out = computeMatchScore(
      makeProperty({ partido: "Avellaneda" }),
      makeProfile({
        zones: [
          { partido: "Lomas de Zamora", priority: "preferido" },
          { partido: "Avellaneda", priority: "descarte" },
        ],
      }),
    );
    expect(out.subscores.zone.value).toBe(10);
    expect(out.subscores.zone.verdict).toBe("unfulfilled");
  });

  it("scores 30 when the partido is not in the profile's list", () => {
    const out = computeMatchScore(
      makeProperty({ partido: "Quilmes" }),
      makeProfile(),
    );
    expect(out.subscores.zone.value).toBe(30);
  });
});

describe("price sub-score", () => {
  it("scores 100 when within range", () => {
    const out = computeMatchScore(
      makeProperty({ price_amount: 150000 }),
      makeProfile({ price_min: 100000, price_max: 200000 }),
    );
    expect(out.subscores.price.value).toBe(100);
  });

  it("scores 100 below the minimum (cheaper is good for the buyer)", () => {
    const out = computeMatchScore(
      makeProperty({ price_amount: 80000 }),
      makeProfile({ price_min: 100000, price_max: 200000 }),
    );
    expect(out.subscores.price.value).toBe(100);
  });

  it("scores 70 at 10% over the max", () => {
    const out = computeMatchScore(
      makeProperty({ price_amount: 220000 }),
      makeProfile({ price_min: 100000, price_max: 200000 }),
    );
    expect(out.subscores.price.value).toBe(70);
  });

  it("scores 5 at 60%+ over the max", () => {
    const out = computeMatchScore(
      makeProperty({ price_amount: 320000 }),
      makeProfile({ price_min: 100000, price_max: 200000 }),
    );
    expect(out.subscores.price.value).toBe(5);
  });

  it("skips with confidence 0 when no price range is set", () => {
    const out = computeMatchScore(
      makeProperty(),
      makeProfile({ price_min: null, price_max: null }),
    );
    expect(out.subscores.price.confidence).toBe(0);
  });

  it("low-confidence when currency mismatches", () => {
    const out = computeMatchScore(
      makeProperty({ price_currency: "ARS" }),
      makeProfile({ price_currency: "USD" }),
    );
    expect(out.subscores.price.confidence).toBe(0.3);
  });
});

describe("type sub-score", () => {
  it("scores 100 when type matches", () => {
    const out = computeMatchScore(
      makeProperty({ property_type: "casa" }),
      makeProfile({ property_types: ["casa", "ph"] }),
    );
    expect(out.subscores.type.value).toBe(100);
  });

  it("scores 10 when type is not in the profile (still on scale)", () => {
    const out = computeMatchScore(
      makeProperty({ property_type: "lote" }),
      makeProfile({ property_types: ["casa", "departamento"] }),
    );
    expect(out.subscores.type.value).toBe(10);
    expect(out.subscores.type.verdict).toBe("unfulfilled");
  });
});

describe("operation sub-score", () => {
  it("scores 100 when operation matches", () => {
    const out = computeMatchScore(
      makeProperty({ operation_type: "venta" }),
      makeProfile({ operation_type: "venta" }),
    );
    expect(out.subscores.operation.value).toBe(100);
  });

  it("scores 10 when operation differs (venta vs alquiler)", () => {
    const out = computeMatchScore(
      makeProperty({ operation_type: "alquiler" }),
      makeProfile({ operation_type: "venta" }),
    );
    expect(out.subscores.operation.value).toBe(10);
  });
});

describe("rooms sub-score", () => {
  it("scores 100 with rooms ≥ min", () => {
    const out = computeMatchScore(
      makeProperty({ rooms: 4 }),
      makeProfile({ rooms_min: 3 }),
    );
    expect(out.subscores.rooms.value).toBe(100);
  });

  it("scores 60 with one less room than min", () => {
    const out = computeMatchScore(
      makeProperty({ rooms: 2 }),
      makeProfile({ rooms_min: 3 }),
    );
    expect(out.subscores.rooms.value).toBe(60);
  });

  it("scores 5 with 3+ rooms short", () => {
    const out = computeMatchScore(
      makeProperty({ rooms: 1 }),
      makeProfile({ rooms_min: 5 }),
    );
    expect(out.subscores.rooms.value).toBe(5);
  });
});

describe("surface sub-score", () => {
  it("scores 100 when at or above min", () => {
    const out = computeMatchScore(
      makeProperty({ surface_total: 120, surface_arba: 118 }),
      makeProfile({ surface_min: 100 }),
    );
    expect(out.subscores.surface.value).toBe(100);
  });

  it("scores 75 within 90% of min", () => {
    const out = computeMatchScore(
      makeProperty({ surface_total: 92, surface_arba: null }),
      makeProfile({ surface_min: 100 }),
    );
    expect(out.subscores.surface.value).toBe(75);
  });

  it("scores 5 below 50% of min", () => {
    const out = computeMatchScore(
      makeProperty({ surface_total: 40, surface_arba: null }),
      makeProfile({ surface_min: 100 }),
    );
    expect(out.subscores.surface.value).toBe(5);
  });
});

describe("must-haves sub-score", () => {
  it("scores 100 when all are satisfied", () => {
    const out = computeMatchScore(
      makeProperty({
        garages: 1,
        description: "Casa con cochera y patio amplio.",
      }),
      makeProfile({ must_haves: ["cochera", "patio"] }),
    );
    expect(out.subscores.must_haves.value).toBe(100);
    expect(out.subscores.must_haves.verdict).toBe("fulfilled");
  });

  it("scores proportionally when some are missing", () => {
    const out = computeMatchScore(
      makeProperty({
        garages: 0,
        description: "Casa con patio.",
      }),
      makeProfile({ must_haves: ["cochera", "patio"] }),
    );
    expect(out.subscores.must_haves.value).toBe(50);
    expect(out.subscores.must_haves.verdict).toBe("partial");
  });

  it("skips when profile has no must-haves", () => {
    const out = computeMatchScore(
      makeProperty(),
      makeProfile({ must_haves: [] }),
    );
    expect(out.subscores.must_haves.confidence).toBe(0);
  });
});

describe("renormalization", () => {
  it("ignores skipped sub-scores in the total", () => {
    // A minimal-but-evaluable profile: just zone + price + type set.
    // Verifies the total is computed only over evaluable sub-scores.
    const out = computeMatchScore(
      makeProperty(),
      makeProfile({
        zones: [{ partido: "Lomas de Zamora", priority: "preferido" }],
        price_min: 100000,
        price_max: 200000,
        property_types: ["casa"],
        operation_type: null,
        rooms_min: null,
        surface_min: null,
        must_haves: [],
      }),
    );
    expect(out.score).not.toBeNull();
    expect(out.subscores.zone.confidence).toBe(1.0);
    expect(out.subscores.price.confidence).toBe(1.0);
    expect(out.subscores.type.confidence).toBe(1.0);
    // Sub-scores that the profile didn't define should be skipped.
    expect(out.subscores.rooms.confidence).toBe(0);
    expect(out.subscores.surface.confidence).toBe(0);
    expect(out.subscores.must_haves.confidence).toBe(0);
    // effective ratio should be ~ (25+25+15+3)/100 = 0.68
    expect(out.effective_weight_ratio).toBeGreaterThan(0.6);
    expect(out.effective_weight_ratio).toBeLessThan(0.75);
  });

  it("flags insufficient_data when no sub-score is confident enough", () => {
    const out = computeMatchScore(
      makeProperty({
        partido: null,
        property_type: null,
        price_amount: null,
        price_currency: null,
        operation_type: null,
        rooms: null,
        surface_total: null,
        surface_arba: null,
      }),
      makeProfile({
        zones: [],
        price_min: null,
        price_max: null,
        property_types: [],
        operation_type: null,
        rooms_min: null,
        surface_min: null,
        must_haves: [],
      }),
    );
    expect(out.score).toBeNull();
    expect(out.insufficient_data).toBe(true);
  });
});

describe("bands", () => {
  it.each([
    [0, "no_fit"],
    [25, "no_fit"],
    [26, "partial"],
    [55, "partial"],
    [56, "good"],
    [80, "good"],
    [81, "perfect"],
    [100, "perfect"],
  ])("score %d → band %s", (score, expectedId) => {
    expect(getMatchBand(score).id).toBe(expectedId);
  });
});

describe("must-have detection", () => {
  it("uses garages count for 'cochera'", () => {
    expect(
      propertySatisfiesMustHave(makeProperty({ garages: 1, description: "" }), "cochera"),
    ).toBe(true);
    expect(
      propertySatisfiesMustHave(
        makeProperty({ garages: 0, description: "Sin cochera." }),
        "cochera",
      ),
    ).toBe(true);
    expect(
      propertySatisfiesMustHave(
        makeProperty({ garages: 0, description: "Casa moderna." }),
        "cochera",
      ),
    ).toBe(false);
  });

  it("strips accents — 'Balcón' matches 'balcon'", () => {
    expect(normalizeTag("Balcón")).toBe("balcon");
    expect(
      propertySatisfiesMustHave(
        makeProperty({ description: "Cuenta con un amplio balcón al frente." }),
        "balcon",
      ),
    ).toBe(true);
  });

  it("accepts synonyms (parrilla / asador / quincho)", () => {
    expect(
      propertySatisfiesMustHave(
        makeProperty({ description: "Quincho con asador y jardín." }),
        "parrilla",
      ),
    ).toBe(true);
  });
});
