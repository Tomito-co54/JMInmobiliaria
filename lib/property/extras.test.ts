import { describe, expect, it } from "vitest";
import {
  extraTitle,
  extrasSpecWords,
  includedExtras,
  optionalExtras,
  priceWithExtras,
  readExtras,
  type PropertyExtra,
} from "./extras";

const COCHERA_OPCIONAL: PropertyExtra = { kind: "cochera", mode: "opcional", detail: null, price_delta: 8000 };
const TERRAZA_INCLUIDA: PropertyExtra = { kind: "terraza", mode: "incluida", detail: "40 m²", price_delta: null };

describe("readExtras", () => {
  it("reads a row value into canonical order, one per kind", () => {
    const out = readExtras([
      { kind: "terraza", mode: "incluida", detail: " 05-02 " },
      { kind: "cochera", mode: "incluida", detail: "00-15", price_delta: null },
      { kind: "cochera", mode: "opcional", price_delta: 5000 },
    ]);
    expect(out.map((e) => e.kind)).toEqual(["cochera", "terraza"]);
    expect(out[0].mode).toBe("incluida");
    expect(out[1].detail).toBe("05-02");
  });

  it("never lets an included extra carry a delta", () => {
    const [e] = readExtras([{ kind: "patio", mode: "incluida", price_delta: 3000 }]);
    expect(e.price_delta).toBeNull();
  });

  it("drops what is not an extra instead of guessing", () => {
    expect(readExtras(null)).toEqual([]);
    expect(readExtras("cochera")).toEqual([]);
    expect(readExtras([{ kind: "pileta", mode: "incluida" }, 3, null])).toEqual([]);
  });
});

describe("priceWithExtras", () => {
  const extras = [COCHERA_OPCIONAL, TERRAZA_INCLUIDA];

  it("is the base price with nothing selected", () => {
    const p = priceWithExtras(80000, extras, new Set());
    expect(p.amount).toBe(80000);
    expect(p.selected).toEqual([]);
  });

  it("adds the delta of a selected optional extra", () => {
    const p = priceWithExtras(80000, extras, new Set(["cochera"]));
    expect(p.amount).toBe(88000);
    expect(p.hasUnpriced).toBe(false);
  });

  it("does not let an included extra be selected into the price twice", () => {
    const p = priceWithExtras(80000, extras, new Set(["terraza"]));
    expect(p.amount).toBe(80000);
    expect(p.selected).toEqual([]);
  });

  it("flags a selected extra that has no delta rather than inventing one", () => {
    const p = priceWithExtras(80000, [{ ...COCHERA_OPCIONAL, price_delta: null }], new Set(["cochera"]));
    expect(p.amount).toBe(80000);
    expect(p.hasUnpriced).toBe(true);
  });

  it("stays null when there is no base price", () => {
    expect(priceWithExtras(null, extras, new Set(["cochera"])).amount).toBeNull();
  });
});

describe("labels", () => {
  it("titles with the detail when there is one", () => {
    expect(extraTitle(TERRAZA_INCLUIDA)).toBe("Terraza 40 m²");
    expect(extraTitle(COCHERA_OPCIONAL)).toBe("Cochera");
  });

  it("spells out on a card which extras are facts and which are choices", () => {
    expect(extrasSpecWords([COCHERA_OPCIONAL, TERRAZA_INCLUIDA])).toEqual([
      "cochera opcional",
      "terraza 40 m²",
    ]);
  });

  it("splits included from optional", () => {
    expect(includedExtras([COCHERA_OPCIONAL, TERRAZA_INCLUIDA])).toEqual([TERRAZA_INCLUIDA]);
    expect(optionalExtras([COCHERA_OPCIONAL, TERRAZA_INCLUIDA])).toEqual([COCHERA_OPCIONAL]);
  });
});
