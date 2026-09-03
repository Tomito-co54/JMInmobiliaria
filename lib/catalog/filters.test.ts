import { describe, expect, it } from "vitest";
import {
  EMPTY_CATALOG_FILTERS,
  applyFilters,
  catalogOptions,
  filtersFromParams,
  filtersToParams,
  hasAnyFilter,
  normalizeText,
  orderByMatch,
  type CatalogProperty,
} from "./filters";
import { EMPTY_MATCH_PREFERENCES } from "@/lib/matching/preferences";

function row(over: Partial<CatalogProperty>): CatalogProperty {
  return {
    id: over.id ?? Math.random().toString(36).slice(2),
    address: "Belgrano 1287 1°A",
    partido: "Lomas de Zamora",
    property_type: "departamento",
    operation_type: "venta",
    price_amount: 80000,
    price_currency: "USD",
    rooms: 2,
    bedrooms: 1,
    bathrooms: 1,
    surface_total: 40,
    surface_arba: null,
    garages: null,
    description: "Dos ambientes con balcón",
    year_built: 2026,
    partida: null,
    photos: [],
    ...over,
  };
}

const VENTA_LOMAS = row({ id: "a", address: "Belgrano 1287 1°A", partido: "Lomas de Zamora" });
const ALQUILER_BANFIELD = row({
  id: "b",
  address: "Talcahuano 258, Banfield",
  partido: "Lomas de Zamora",
  property_type: "casa",
  operation_type: "alquiler",
  price_currency: "ARS",
  price_amount: 1900000,
  description: "Casa con terraza y patio",
});
const VENTA_LANUS = row({ id: "c", address: "Sarmiento 100", partido: "Lanús", property_type: "ph" });

describe("normalizeText", () => {
  it("drops accents and case so a search typed without them still finds the word", () => {
    expect(normalizeText("Lanús TERRAZA")).toBe("lanus terraza");
  });
});

describe("applyFilters", () => {
  const all = [VENTA_LOMAS, ALQUILER_BANFIELD, VENTA_LANUS];

  it("leaves everything alone with no filter", () => {
    expect(applyFilters(all, EMPTY_CATALOG_FILTERS)).toHaveLength(3);
  });

  it("matches every word of the search anywhere in the listing", () => {
    const ids = (f: string) => applyFilters(all, { ...EMPTY_CATALOG_FILTERS, q: f }).map((p) => p.id);
    expect(ids("banfield")).toEqual(["b"]);
    expect(ids("lanus")).toEqual(["c"]);
    expect(ids("terraza casa")).toEqual(["b"]);
    expect(ids("belgrano terraza")).toEqual([]);
    expect(ids("PH")).toEqual(["c"]);
  });

  it("the selectors are exact", () => {
    expect(applyFilters(all, { ...EMPTY_CATALOG_FILTERS, operation: "alquiler" }).map((p) => p.id)).toEqual(["b"]);
    expect(applyFilters(all, { ...EMPTY_CATALOG_FILTERS, partido: "Lanús" }).map((p) => p.id)).toEqual(["c"]);
    expect(applyFilters(all, { ...EMPTY_CATALOG_FILTERS, type: "departamento" }).map((p) => p.id)).toEqual(["a"]);
  });

  it("combines them", () => {
    const out = applyFilters(all, {
      q: "belgrano",
      partido: "Lomas de Zamora",
      operation: "venta",
      type: "departamento",
      area: null,
    });
    expect(out.map((p) => p.id)).toEqual(["a"]);
  });
});

describe("applyFilters — el área del mapa", () => {
  const banfield = row({ id: "n", address: "Talcahuano 258", lat: -34.74196, lng: -58.39215 });
  const lomas = row({ id: "s", address: "Alsina 1639", lat: -34.7557, lng: -58.3959 });
  const nowhere = row({ id: "x", address: "Sin ubicación", lat: null, lng: null });
  const AREA = { south: -34.75, west: -58.4, north: -34.73, east: -58.38 };

  it("keeps what is inside the rectangle and nothing else", () => {
    const out = applyFilters([banfield, lomas, nowhere], { ...EMPTY_CATALOG_FILTERS, area: AREA });
    expect(out.map((p) => p.id)).toEqual(["n"]);
  });

  it("a listing with no position is never inside an area", () => {
    const wide = { south: -90, west: -180, north: 90, east: 180 };
    const out = applyFilters([nowhere, banfield], { ...EMPTY_CATALOG_FILTERS, area: wide });
    expect(out.map((p) => p.id)).toEqual(["n"]);
  });

  it("round-trips through the URL at metre precision", () => {
    const f = { ...EMPTY_CATALOG_FILTERS, area: AREA };
    const params = filtersToParams(f);
    expect(params.get("area")).toBe("-34.75000,-58.40000,-34.73000,-58.38000");
    expect(filtersFromParams(params).area).toEqual(AREA);
  });

  it("refuses an area that is not four numbers in order", () => {
    expect(filtersFromParams(new URLSearchParams("area=1,2,3")).area).toBeNull();
    expect(filtersFromParams(new URLSearchParams("area=a,b,c,d")).area).toBeNull();
    expect(filtersFromParams(new URLSearchParams("area=-34.73,-58.4,-34.75,-58.38")).area).toBeNull();
  });
});

describe("catalogOptions", () => {
  it("offers only what the catalog has, in a stable order", () => {
    const o = catalogOptions([VENTA_LOMAS, ALQUILER_BANFIELD, VENTA_LANUS]);
    expect(o.partidos).toEqual(["Lanús", "Lomas de Zamora"]);
    expect(o.operations).toEqual(["venta", "alquiler"]);
    expect(o.types).toEqual(["casa", "departamento", "ph"]);
  });

  it("has a single operation when the catalog is sale-only", () => {
    expect(catalogOptions([VENTA_LOMAS, VENTA_LANUS]).operations).toEqual(["venta"]);
  });
});

describe("filters <-> URL", () => {
  it("round-trips, omitting what is empty", () => {
    const f = { q: "belgrano", partido: null, operation: "venta" as const, type: null, area: null };
    const params = filtersToParams(f);
    expect(params.toString()).toBe("q=belgrano&op=venta");
    expect(filtersFromParams(params)).toEqual(f);
  });

  it("ignores an operation it does not know", () => {
    expect(filtersFromParams(new URLSearchParams("op=permuta")).operation).toBeNull();
  });

  it("knows when nothing is set", () => {
    expect(hasAnyFilter(EMPTY_CATALOG_FILTERS)).toBe(false);
    expect(hasAnyFilter({ ...EMPTY_CATALOG_FILTERS, q: "  " })).toBe(false);
    expect(hasAnyFilter({ ...EMPTY_CATALOG_FILTERS, type: "casa" })).toBe(true);
  });
});

describe("orderByMatch", () => {
  const all = [VENTA_LOMAS, ALQUILER_BANFIELD, VENTA_LANUS];

  it("leaves the order alone and scores nothing when the visitor said nothing", () => {
    const out = orderByMatch(all, EMPTY_MATCH_PREFERENCES);
    expect(out.map((s) => s.property.id)).toEqual(["a", "b", "c"]);
    expect(out.every((s) => s.score === null)).toBe(true);
  });

  it("sinks the wrong operation even when nothing else was asked", () => {
    // Only "alquilar": the matcher has too little to score anything, so
    // every score is null — but the sales still have to go under the rental.
    const out = orderByMatch(all, { ...EMPTY_MATCH_PREFERENCES, operation: "alquiler" });
    expect(out.map((s) => s.property.id)).toEqual(["b", "a", "c"]);
    expect(out[0].score).toBeNull();
    expect(out[1].score).toBe(0);
  });

  it("puts the best match first once there is enough to score", () => {
    const out = orderByMatch(all, {
      ...EMPTY_MATCH_PREFERENCES,
      operation: "venta",
      partidos: ["Lanús"],
      propertyTypes: ["ph"],
      roomsMin: 2,
    });
    expect(out[0].property.id).toBe("c");
    expect(out[0].score).toBeGreaterThan(out[1].score ?? -1);
    expect(out[2].property.id).toBe("b");
  });

  it("keeps arrival order among ties", () => {
    const out = orderByMatch([VENTA_LOMAS, VENTA_LANUS], { ...EMPTY_MATCH_PREFERENCES, operation: "venta" });
    expect(out.map((s) => s.property.id)).toEqual(["a", "c"]);
  });
});
