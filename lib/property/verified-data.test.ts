import { describe, expect, it } from "vitest";
import { deriveVerifiedDataItems } from "./verified-data";

function makeProperty(overrides: Partial<Parameters<typeof deriveVerifiedDataItems>[0]> = {}) {
  return {
    partida: "12345",
    nomenclatura_catastral: "070-01-001-01-001",
    surface_arba: 100,
    surface_total: 98,
    surface_covered: null,
    lat: -34.7,
    lng: -58.4,
    ...overrides,
  } as Parameters<typeof deriveVerifiedDataItems>[0];
}

describe("deriveVerifiedDataItems", () => {
  it("emits a verified parcela item when partida is present", () => {
    const items = deriveVerifiedDataItems(makeProperty(), {
      match_strategy: "intersects",
      distance_meters: 0,
      raw_response: null,
    });
    const parcela = items.find((i) => i.id === "parcela_arba")!;
    expect(parcela.status).toBe("verified");
    expect(parcela.detail).toContain("12345");
  });

  it("emits a missing parcela item when partida is absent", () => {
    const items = deriveVerifiedDataItems(
      makeProperty({ partida: null }),
      null,
    );
    const parcela = items.find((i) => i.id === "parcela_arba")!;
    expect(parcela.status).toBe("missing");
  });

  it("reports both surfaces, each as what it is", () => {
    const items = deriveVerifiedDataItems(
      makeProperty({ surface_total: 98, surface_arba: 100 }),
      null,
    );
    const sup = items.find((i) => i.id === "superficie")!;
    expect(sup.status).toBe("verified");
    expect(sup.detail).toContain("98m²");
    expect(sup.detail).toContain("100m²");
    expect(sup.detail).toContain("parcela");
  });

  // A flat on a lot is not a discrepancy, and the page that says what has
  // been verified is the last place to imply otherwise. Both numbers are
  // reported; neither is judged against the other. Same reason the score's
  // coherence sub-score is parked.
  it("never calls a unit-vs-parcel gap a discrepancy", () => {
    for (const [total, arba] of [[120, 100], [104, 244.94], [40, 239.23]] as const) {
      const items = deriveVerifiedDataItems(
        makeProperty({ surface_total: total, surface_arba: arba }),
        null,
      );
      const sup = items.find((i) => i.id === "superficie")!;
      expect(sup.status, `${total} vs ${arba}`).toBe("verified");
      expect(sup.detail).toContain(`${arba}m²`);
      expect(sup.detail).toContain(`${total}m²`);
    }
  });

  it("falls back to surface_covered when surface_total is missing", () => {
    const items = deriveVerifiedDataItems(
      makeProperty({ surface_total: null, surface_covered: 98, surface_arba: 100 }),
      null,
    );
    const sup = items.find((i) => i.id === "superficie")!;
    expect(sup.status).toBe("verified");
  });

  it("warns when only ARBA surface is present", () => {
    const items = deriveVerifiedDataItems(
      makeProperty({ surface_total: null, surface_covered: null, surface_arba: 100 }),
      null,
    );
    const sup = items.find((i) => i.id === "superficie")!;
    expect(sup.status).toBe("warning");
    expect(sup.title).toContain("Solo superficie ARBA");
  });

  it("warns when only declared surface is present", () => {
    const items = deriveVerifiedDataItems(
      makeProperty({ surface_total: 100, surface_arba: null }),
      null,
    );
    const sup = items.find((i) => i.id === "superficie")!;
    expect(sup.status).toBe("warning");
    expect(sup.title).toContain("no verificable");
  });

  it("marks both surfaces missing as a hard miss", () => {
    const items = deriveVerifiedDataItems(
      makeProperty({
        surface_total: null,
        surface_covered: null,
        surface_arba: null,
      }),
      null,
    );
    const sup = items.find((i) => i.id === "superficie")!;
    expect(sup.status).toBe("missing");
  });

  it("only emits nomenclatura when present", () => {
    const withIt = deriveVerifiedDataItems(makeProperty(), null);
    expect(withIt.find((i) => i.id === "nomenclatura")).toBeDefined();

    const without = deriveVerifiedDataItems(
      makeProperty({ nomenclatura_catastral: null }),
      null,
    );
    expect(without.find((i) => i.id === "nomenclatura")).toBeUndefined();
  });

  it("classifies match strategy correctly", () => {
    const intersects = deriveVerifiedDataItems(makeProperty(), {
      match_strategy: "intersects",
      distance_meters: 0,
      raw_response: null,
    });
    expect(intersects.find((i) => i.id === "match")?.status).toBe("verified");

    const dwithin = deriveVerifiedDataItems(makeProperty(), {
      match_strategy: "dwithin",
      distance_meters: 12.5,
      raw_response: null,
    });
    const m = dwithin.find((i) => i.id === "match")!;
    expect(m.status).toBe("warning");
    expect(m.detail).toContain("13m"); // rounded

    const noLookup = deriveVerifiedDataItems(makeProperty(), null);
    expect(noLookup.find((i) => i.id === "match")).toBeUndefined();
  });
});
