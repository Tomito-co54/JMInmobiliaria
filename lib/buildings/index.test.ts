import { describe, it, expect } from "vitest";
import { buildingKey, groupByBuilding, summariseBuildings } from "./index";

const PARCEL_A = "063030B00000000000000000000000150000027000";
const PARCEL_B = "063020A0000000000000000000000068000000400A";

const unit = (
  nomenclatura: string | null,
  price: number | null = 80000,
  currency: "USD" | "ARS" | null = "USD",
) => ({
  nomenclatura_catastral: nomenclatura,
  price_amount: price,
  price_currency: currency,
});

describe("buildingKey", () => {
  it("is the cadastral parcel", () => {
    expect(buildingKey({ nomenclatura_catastral: PARCEL_A })).toBe(PARCEL_A);
  });

  it("is null when ARBA never answered — a normal outcome, not a failure", () => {
    expect(buildingKey({ nomenclatura_catastral: null })).toBeNull();
    expect(buildingKey({ nomenclatura_catastral: "   " })).toBeNull();
  });
});

describe("groupByBuilding", () => {
  it("groups the units of one building", () => {
    const groups = groupByBuilding([
      unit(PARCEL_A),
      unit(PARCEL_A),
      unit(PARCEL_B),
    ]);
    expect(groups.get(PARCEL_A)).toHaveLength(2);
    expect(groups.get(PARCEL_B)).toHaveLength(1);
  });

  it("leaves out what it cannot place", () => {
    const groups = groupByBuilding([unit(null), unit(PARCEL_A)]);
    expect(groups.size).toBe(1);
    expect([...groups.values()].flat()).toHaveLength(1);
  });
});

describe("summariseBuildings", () => {
  it("counts the units and takes the cheapest as 'desde'", () => {
    const s = summariseBuildings([
      unit(PARCEL_A, 96000),
      unit(PARCEL_A, 80000),
      unit(PARCEL_A, 96000),
    ]).get(PARCEL_A)!;
    expect(s.unitCount).toBe(3);
    expect(s.fromPrice).toBe(80000);
    expect(s.fromCurrency).toBe("USD");
  });

  // A badge reading "1 unidad" would sit on every other card in the catalog
  // and say nothing.
  it("ignores a building with a single unit", () => {
    expect(summariseBuildings([unit(PARCEL_A)]).size).toBe(0);
  });

  it("never mixes currencies in the 'desde'", () => {
    const s = summariseBuildings([
      unit(PARCEL_A, 80000, "USD"),
      unit(PARCEL_A, 96000, "USD"),
      unit(PARCEL_A, 5000, "ARS"),
    ]).get(PARCEL_A)!;
    expect(s.fromCurrency).toBe("USD");
    expect(s.fromPrice).toBe(80000);
  });

  it("still counts units when none of them has a price", () => {
    const s = summariseBuildings([
      unit(PARCEL_A, null, null),
      unit(PARCEL_A, null, null),
    ]).get(PARCEL_A)!;
    expect(s.unitCount).toBe(2);
    expect(s.fromPrice).toBeNull();
  });

  it("ignores a price of zero rather than showing 'desde 0'", () => {
    const s = summariseBuildings([
      unit(PARCEL_A, 0, "USD"),
      unit(PARCEL_A, 80000, "USD"),
    ]).get(PARCEL_A)!;
    expect(s.fromPrice).toBe(80000);
  });
});
