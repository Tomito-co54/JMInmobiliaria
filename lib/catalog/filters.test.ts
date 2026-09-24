import { describe, expect, it } from "vitest";
import {
  EMPTY_CATALOG_FILTERS,
  applyFilters,
  catalogOptions,
  filtersFromParams,
  filtersToParams,
  hasAnyFilter,
  narrowedOptions,
  dropStaleAnswers,
  normalizeText,
  orderByMatch,
  ownFirst,
  sortCatalog,
  topLocalidades,
  sortFromParams,
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
    expect(applyFilters(all, { ...EMPTY_CATALOG_FILTERS, operations: ["alquiler"] }).map((p) => p.id)).toEqual(["b"]);
    expect(applyFilters(all, { ...EMPTY_CATALOG_FILTERS, partido: "Lanús" }).map((p) => p.id)).toEqual(["c"]);
    expect(applyFilters(all, { ...EMPTY_CATALOG_FILTERS, types: ["departamento"] }).map((p) => p.id)).toEqual(["a"]);
  });

  it("keeps any of several operations and types", () => {
    const ids = (f: Partial<typeof EMPTY_CATALOG_FILTERS>) =>
      applyFilters(all, { ...EMPTY_CATALOG_FILTERS, ...f }).map((p) => p.id);
    expect(ids({ operations: ["venta", "alquiler"] })).toEqual(ids({}));
    expect(ids({ types: ["departamento", "ph"] })).toEqual(["a", "c"]);
  });

  it("combines them", () => {
    const out = applyFilters(all, {
      q: "belgrano",
      partido: "Lomas de Zamora",
      localidades: [],
      operations: ["venta"],
      types: ["departamento"],
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
    const f = { ...EMPTY_CATALOG_FILTERS, q: "belgrano", operations: ["venta" as const] };
    const params = filtersToParams(f);
    expect(params.toString()).toBe("q=belgrano&op=venta");
    expect(filtersFromParams(params)).toEqual(f);
  });

  it("ignores an operation it does not know", () => {
    expect(filtersFromParams(new URLSearchParams("op=permuta")).operations).toEqual([]);
    expect(filtersFromParams(new URLSearchParams("op=permuta,alquiler")).operations).toEqual(["alquiler"]);
  });

  it("carries several operations and types, and reads an old single-value link", () => {
    const f = { ...EMPTY_CATALOG_FILTERS, operations: ["venta" as const, "alquiler" as const], types: ["casa", "ph"] };
    const params = filtersToParams(f);
    expect(params.get("op")).toBe("venta,alquiler");
    expect(params.get("tipo")).toBe("casa,ph");
    expect(filtersFromParams(params)).toEqual(f);
    expect(filtersFromParams(new URLSearchParams("op=venta&tipo=casa"))).toMatchObject({
      operations: ["venta"],
      types: ["casa"],
    });
  });

  it("knows when nothing is set", () => {
    expect(hasAnyFilter(EMPTY_CATALOG_FILTERS)).toBe(false);
    expect(hasAnyFilter({ ...EMPTY_CATALOG_FILTERS, q: "  " })).toBe(false);
    expect(hasAnyFilter({ ...EMPTY_CATALOG_FILTERS, types: ["casa"] })).toBe(true);
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

describe("localidad", () => {
  const banfield = row({ id: "l1", localidad: "Banfield" });
  const temperley = row({ id: "l2", localidad: "Temperley" });
  const unknown = row({ id: "l3", localidad: null });
  const list = [banfield, temperley, unknown];

  it("offers only the localidades the catalog has", () => {
    expect(catalogOptions(list).localidades).toEqual(["Banfield", "Temperley"]);
  });

  it("filters by it, leaving out the listings that have none", () => {
    expect(applyFilters(list, { ...EMPTY_CATALOG_FILTERS, localidades: ["Banfield"] }).map((p) => p.id)).toEqual(["l1"]);
  });

  it("keeps a listing in any of several localidades", () => {
    const out = applyFilters(list, { ...EMPTY_CATALOG_FILTERS, localidades: ["Banfield", "Temperley"] });
    expect(out.map((p) => p.id)).toEqual(["l1", "l2"]);
  });

  it("travels in the URL as loc, several separated by commas", () => {
    const params = filtersToParams({ ...EMPTY_CATALOG_FILTERS, localidades: ["Banfield", "Temperley"] });
    expect(params.get("loc")).toBe("Banfield,Temperley");
    expect(filtersFromParams(params).localidades).toEqual(["Banfield", "Temperley"]);
    expect(filtersFromParams(new URLSearchParams("")).localidades).toEqual([]);
  });

  it("is found by the search box", () => {
    expect(applyFilters(list, { ...EMPTY_CATALOG_FILTERS, q: "temperley" }).map((p) => p.id)).toEqual(["l2"]);
  });
});

describe("sortCatalog", () => {
  const scored = (...rows: CatalogProperty[]) => rows.map((property) => ({ property, score: null }));
  const ids = (list: { property: CatalogProperty }[]) => list.map((x) => x.property.id);

  const cheap = row({ id: "cheap", price_amount: 53000 });
  const pricey = row({ id: "pricey", price_amount: 126000 });
  const rent = row({ id: "rent", operation_type: "alquiler", price_amount: 1900000, price_currency: "ARS" });
  const noPrice = row({ id: "noprice", price_amount: null });

  it("leaves the order alone without a sort", () => {
    expect(ids(sortCatalog(scored(pricey, cheap), null))).toEqual(["pricey", "cheap"]);
  });

  it("orders by price both ways, never mixing pesos with dollars", () => {
    const list = scored(rent, pricey, noPrice, cheap);
    expect(ids(sortCatalog(list, "precio-asc"))).toEqual(["cheap", "pricey", "rent", "noprice"]);
    expect(ids(sortCatalog(list, "precio-desc"))).toEqual(["pricey", "cheap", "rent", "noprice"]);
  });

  it("puts the newest first and the ones without a year last", () => {
    const old = row({ id: "old", year_built: 1998 });
    const brandNew = row({ id: "new", year_built: 2026 });
    const unknownYear = row({ id: "unknown", year_built: null });
    expect(ids(sortCatalog(scored(old, unknownYear, brandNew), "nuevas"))).toEqual(["new", "old", "unknown"]);
  });

  it("keeps each score with its property", () => {
    const out = sortCatalog(
      [
        { property: pricey, score: 90 },
        { property: cheap, score: 40 },
      ],
      "precio-asc",
    );
    expect(out).toEqual([
      { property: cheap, score: 40 },
      { property: pricey, score: 90 },
    ]);
  });

  it("reads only known orders from the URL", () => {
    expect(sortFromParams(new URLSearchParams("orden=precio-asc"))).toBe("precio-asc");
    expect(sortFromParams(new URLSearchParams("orden=barato"))).toBeNull();
  });
});

describe("narrowedOptions and dropStaleAnswers", () => {
  const depto = row({ id: "d", operation_type: "venta", property_type: "departamento", localidad: "Banfield" });
  const casaAlq = row({ id: "c", operation_type: "alquiler", property_type: "casa", localidad: "Temperley" });
  const casaVenta = row({ id: "v", operation_type: "venta", property_type: "casa", localidad: "Lomas de Zamora" });
  const list = [depto, casaAlq, casaVenta];

  it("offers only the types for the chosen operation, and the places for both", () => {
    expect(narrowedOptions(list, { operations: ["alquiler"], types: [] }).types).toEqual(["casa"]);
    expect(narrowedOptions(list, { operations: ["venta"], types: ["casa"] }).localidades).toEqual(["Lomas de Zamora"]);
    expect(narrowedOptions(list, { operations: [], types: [] }).operations).toEqual(["venta", "alquiler"]);
    expect(narrowedOptions(list, { operations: ["venta", "alquiler"], types: [] }).types).toEqual(["casa", "departamento"]);
  });

  it("clears a type and a place that the new operation does not have", () => {
    const f = { ...EMPTY_CATALOG_FILTERS, operations: ["alquiler" as const], types: ["departamento", "casa"], localidades: ["Banfield"] };
    expect(dropStaleAnswers(list, f)).toMatchObject({ types: ["casa"], localidades: [] });
  });

  it("keeps answers that still fit, and returns the same object", () => {
    const f = { ...EMPTY_CATALOG_FILTERS, operations: ["venta" as const], types: ["casa"], localidades: ["Lomas de Zamora"] };
    expect(dropStaleAnswers(list, f)).toBe(f);
  });
});

describe("ownFirst", () => {
  it("puts the family's listings ahead of a partner's, keeping each group's order", () => {
    const list = [
      row({ id: "p1", source: "colega" }),
      row({ id: "o1", source: "owner_direct" }),
      row({ id: "p2", source: "colega" }),
      row({ id: "o2", source: "agency" }),
    ];
    expect(ownFirst(list).map((p) => p.id)).toEqual(["o1", "o2", "p1", "p2"]);
  });

  it("lets the family's listing win a match tie", () => {
    const partner = row({ id: "p", source: "colega" });
    const own = row({ id: "o", source: "owner_direct" });
    const ordered = orderByMatch(ownFirst([partner, own]), { ...EMPTY_MATCH_PREFERENCES, roomsMin: 2 });
    expect(ordered.map((x) => x.property.id)).toEqual(["o", "p"]);
  });
});

describe("topLocalidades", () => {
  it("names the busiest localidades first, ties alphabetically, and skips listings without one", () => {
    const list = [
      { localidad: "Banfield" },
      { localidad: "Adrogué" },
      { localidad: "Adrogué" },
      { localidad: "Burzaco" },
      { localidad: null },
    ];
    expect(topLocalidades(list, 2)).toEqual(["Adrogué", "Banfield"]);
    expect(topLocalidades([], 5)).toEqual([]);
  });
});
