import { describe, expect, it } from "vitest";
import {
  catalogOperationLabel,
  currencySymbol,
  formatAmount,
  formatPrice,
  isRental,
  labelWithOperation,
  operationLabel,
  operationNoun,
  pricePeriodSuffix,
} from "./price";

describe("currencySymbol", () => {
  it("writes pesos with the local sign", () => {
    expect(currencySymbol("ARS")).toBe("$");
  });

  it("keeps dollars explicit — a bare $ would read as pesos here", () => {
    expect(currencySymbol("USD")).toBe("USD");
  });
});

describe("formatAmount", () => {
  it("groups thousands the Argentine way", () => {
    expect(formatAmount(80000)).toBe("80.000");
    expect(formatAmount(1250000)).toBe("1.250.000");
  });

  it("rounds rather than printing cents in a price tag", () => {
    expect(formatAmount(80000.4)).toBe("80.000");
  });
});

describe("pricePeriodSuffix", () => {
  it("marks a rental as monthly", () => {
    expect(pricePeriodSuffix("alquiler")).toBe(" por mes");
    expect(pricePeriodSuffix("alquiler", true)).toBe("/mes");
  });

  it("leaves a sale bare", () => {
    expect(pricePeriodSuffix("venta")).toBe("");
  });

  it("leaves an unknown operation bare instead of guessing", () => {
    expect(pricePeriodSuffix(null)).toBe("");
  });
});

describe("formatPrice", () => {
  it("prints a sale as a one-off amount", () => {
    expect(formatPrice(80000, "USD", "venta")).toBe("USD 80.000");
  });

  // The period is opt-in: the listing's own label ("Casa en alquiler") is
  // what marks a rent as monthly wherever there is a label to do it.
  it("leaves the number clean by default, even for a rental", () => {
    expect(formatPrice(500000, "ARS", "alquiler")).toBe("$ 500.000");
  });

  it("prints the period when asked, for prices that travel without a label", () => {
    expect(formatPrice(500000, "ARS", "alquiler", { period: true })).toBe(
      "$ 500.000 por mes",
    );
  });

  it("shortens the period in the compact form used by cards", () => {
    expect(formatPrice(500000, "ARS", "alquiler", { compact: true, period: true })).toBe(
      "$ 500.000/mes",
    );
  });

  it("handles a rental quoted in dollars", () => {
    expect(formatPrice(900, "USD", "alquiler", { period: true })).toBe("USD 900 por mes");
  });

  it("never invents a period for an unknown operation, even when asked", () => {
    expect(formatPrice(80000, "USD", null, { period: true })).toBe("USD 80.000");
  });

  it("never puts a period on a sale", () => {
    expect(formatPrice(80000, "USD", "venta", { period: true })).toBe("USD 80.000");
  });

  it("returns null when there is nothing to show", () => {
    expect(formatPrice(null, "USD", "venta")).toBeNull();
    expect(formatPrice(80000, null, "venta")).toBeNull();
    expect(formatPrice(Number.NaN, "USD", "venta")).toBeNull();
  });

  it("shows a zero price rather than swallowing it", () => {
    // 0 is a real value that a loader can produce; the caller decides whether
    // it is publishable. Returning null here would hide it instead.
    expect(formatPrice(0, "USD", "venta")).toBe("USD 0");
  });
});

describe("operationLabel / operationNoun / isRental", () => {
  it("labels both operations", () => {
    expect(operationLabel("venta")).toBe("en venta");
    expect(operationLabel("alquiler")).toBe("en alquiler");
    expect(operationNoun("venta")).toBe("Venta");
    expect(operationNoun("alquiler")).toBe("Alquiler");
  });

  it("says nothing when the operation is unknown", () => {
    expect(operationLabel(null)).toBeNull();
    expect(operationNoun(null)).toBeNull();
  });

  it("identifies rentals", () => {
    expect(isRental("alquiler")).toBe(true);
    expect(isRental("venta")).toBe(false);
    expect(isRental(null)).toBe(false);
  });
});

describe("labelWithOperation", () => {
  it("names the operation in the label that names the property", () => {
    expect(labelWithOperation("Casa", "alquiler")).toBe("Casa en alquiler");
    expect(labelWithOperation("Departamento", "venta")).toBe("Departamento en venta");
  });

  it("keeps each surface's own vocabulary", () => {
    // The narrow legacy card abbreviates; unifying that here would be a
    // rendering decision made in the wrong place.
    expect(labelWithOperation("Depto", "alquiler")).toBe("Depto en alquiler");
  });

  it("leaves the label alone when the operation is unknown", () => {
    expect(labelWithOperation("Casa", null)).toBe("Casa");
  });

  it("falls back to the operation alone when there is no type", () => {
    expect(labelWithOperation(null, "alquiler")).toBe("Alquiler");
    expect(labelWithOperation(null, null)).toBeNull();
  });
});

describe("catalogOperationLabel", () => {
  it("qualifies a single-operation catalog", () => {
    expect(catalogOperationLabel(["venta", "venta"])).toBe("en venta");
    expect(catalogOperationLabel(["alquiler"])).toBe("en alquiler");
  });

  it("drops the qualifier on a mixed catalog rather than half-lying", () => {
    expect(catalogOperationLabel(["venta", "alquiler"])).toBeNull();
  });

  it("drops it on an empty catalog too — nothing is known", () => {
    expect(catalogOperationLabel([])).toBeNull();
  });

  it("ignores listings with no operation set", () => {
    expect(catalogOperationLabel(["venta", null, undefined])).toBe("en venta");
  });
});
