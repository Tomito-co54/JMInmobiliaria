import { describe, it, expect } from "vitest";
import {
  buildingKey,
  buildingLabel,
  groupByBuilding,
  summariseBuildings,
} from "./index";

const PARCEL_A = "063030B00000000000000000000000150000027000";
const PARCEL_B = "063020A0000000000000000000000068000000400A";

const unit = (
  nomenclatura: string | null,
  price: number | null = 80000,
  currency: "USD" | "ARS" | null = "USD",
  operation: "venta" | "alquiler" | null = "venta",
) => ({
  nomenclatura_catastral: nomenclatura,
  price_amount: price,
  price_currency: currency,
  operation_type: operation,
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

  it("never mixes operations in the 'desde' either", () => {
    // Three flats for sale and one to let. The rent is the smallest number in
    // the building by an order of magnitude, so a cohort keyed on currency
    // alone would advertise a building of USD 80.000 flats as "desde $
    // 450.000 " — a price for something else entirely.
    const s = summariseBuildings([
      unit(PARCEL_A, 80000, "USD", "venta"),
      unit(PARCEL_A, 96000, "USD", "venta"),
      unit(PARCEL_A, 96000, "USD", "venta"),
      unit(PARCEL_A, 450000, "ARS", "alquiler"),
    ]).get(PARCEL_A)!;
    expect(s.fromOperation).toBe("venta");
    expect(s.fromPrice).toBe(80000);
    expect(s.unitCount).toBe(4);
  });

  it("reports the operation so the 'desde' can be shown per month", () => {
    const s = summariseBuildings([
      unit(PARCEL_A, 500000, "ARS", "alquiler"),
      unit(PARCEL_A, 450000, "ARS", "alquiler"),
    ]).get(PARCEL_A)!;
    expect(s.fromOperation).toBe("alquiler");
    expect(s.fromPrice).toBe(450000);
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

describe("buildingLabel", () => {
  const at = (...addresses: (string | null)[]) =>
    addresses.map((address) => ({ address }));

  it("names the owner catalog's building from what the units share", () => {
    // The four RUMAH units, typed by hand and precise.
    expect(
      buildingLabel(
        at(
          "Belgrano 1287 1°A",
          "Belgrano 1287 1°B",
          "Belgrano 1287 2°A",
          "Belgrano 1287 2°B",
        ),
      ),
    ).toBe("Belgrano 1287");
  });

  it("falls back to the most common address when spellings diverge", () => {
    // A real parcel in Lomas holds ten scraped listings written four ways.
    // Their common prefix is one letter, so the prefix pass has to give up.
    expect(
      buildingLabel(
        at(
          "alsina 1639",
          "Alsina 1639",
          "Alsina 1639",
          "ALSINA 1639",
          "Avenida Alsina 1639",
        ),
      ),
    ).toBe("Alsina 1639");
  });

  it("refuses a prefix that names a street rather than a building", () => {
    // "Belgrano al 1200" and "Belgrano 1840" share only "Belgrano", which is
    // a street. Without the digit test the page would head a group with it.
    const label = buildingLabel(at("Belgrano al 1200", "Belgrano 1840"));
    expect(label).not.toBe("Belgrano");
  });

  it("does not cut mid-word", () => {
    const label = buildingLabel(at("Loria 1400 3°A", "Loria 1400 3°B"));
    expect(label).toBe("Loria 1400");
  });

  it("handles a single unit and no address at all", () => {
    expect(buildingLabel(at("Colombres 700"))).toBe("Colombres 700");
    expect(buildingLabel(at(null, null))).toBeNull();
    expect(buildingLabel([])).toBeNull();
  });

  it("ignores units with no address when others have one", () => {
    expect(buildingLabel(at("Vergara 1500", null))).toBe("Vergara 1500");
  });
});
