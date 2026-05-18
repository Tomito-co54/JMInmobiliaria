import type { HistoryEvent, PropertyForScoring, ScoringInput } from "./types";

/**
 * Test-only fixtures. Lives in lib/ rather than next to a single test file
 * because both subscores.test.ts and quality.test.ts share these shapes.
 */

export function makeProperty(overrides: Partial<PropertyForScoring> = {}): PropertyForScoring {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    source: "zonaprop",
    property_type: "casa",
    partido: "Lomas de Zamora",
    partida: "12345",
    nomenclatura_catastral: "070-01-001-01-001-001",
    address: "Av. Hipólito Yrigoyen 1234, Lomas de Zamora",
    lat: -34.7634,
    lng: -58.4055,
    price_amount: 200000,
    price_currency: "USD",
    surface_total: 100,
    surface_covered: 80,
    surface_arba: 98,
    rooms: 4,
    bedrooms: 3,
    bathrooms: 2,
    garages: 1,
    description: "Casa amplia con jardín, ubicada en zona residencial tranquila. ".repeat(20),
    photos: ["https://example.com/1.jpg", "https://example.com/2.jpg"],
    first_seen_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    last_seen_at: new Date().toISOString(),
    is_active: true,
    ...overrides,
  };
}

export function makeInput(overrides: Partial<ScoringInput> = {}): ScoringInput {
  // Use `in` to distinguish "explicit null" from "absent" — overriding to
  // null (e.g. arbaLookup: null) must win against the default.
  return {
    property: "property" in overrides && overrides.property ? overrides.property : makeProperty(),
    arbaLookup: "arbaLookup" in overrides ? overrides.arbaLookup! : { matchStrategy: "intersects" },
    history: "history" in overrides && overrides.history ? overrides.history : [],
    comparableStats:
      "comparableStats" in overrides && overrides.comparableStats
        ? overrides.comparableStats
        : { medianPricePerM2Usd: 2000, sampleSize: 12 },
  };
}

export function priceDropEvent(daysAgo: number, oldPrice: number, newPrice: number): HistoryEvent {
  return {
    changed_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
    field_changed: "price_amount",
    old_value: String(oldPrice),
    new_value: String(newPrice),
  };
}
