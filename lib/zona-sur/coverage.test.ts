import { describe, it, expect } from "vitest";
import { COVERAGE_AREA, COVERAGE_LABEL } from "./coverage";
import { isInside, boundsOfPoints } from "@/lib/market/geo";

describe("COVERAGE_AREA", () => {
  it("is the hexagon the diagram expects", () => {
    expect(COVERAGE_AREA).toHaveLength(6);
  });

  it("covers the places its own caption names", () => {
    // If the drawing says Lanús, Banfield and Lomas, the shape has to
    // actually contain them — otherwise it is decoration with a label.
    const towns = {
      "Lanús": { lat: -34.7063, lng: -58.3927 },
      Banfield: { lat: -34.7441, lng: -58.3937 },
      "Lomas de Zamora": { lat: -34.7601, lng: -58.4006 },
      Temperley: { lat: -34.7712, lng: -58.3975 },
    };
    const box = boundsOfPoints(COVERAGE_AREA)!;
    for (const [name, point] of Object.entries(towns)) {
      expect(isInside(point, box), name).toBe(true);
    }
  });

  it("contains the featured property's own block", () => {
    // Belgrano 1285, the parcel this section used to draw on its own.
    expect(isInside({ lat: -34.7461, lng: -58.392 }, boundsOfPoints(COVERAGE_AREA)!)).toBe(true);
  });

  it("stays in Zona Sur instead of swallowing the city", () => {
    // Sanity bounds: the Obelisco is not part of the coverage claim.
    const box = boundsOfPoints(COVERAGE_AREA)!;
    expect(isInside({ lat: -34.6037, lng: -58.3816 }, box)).toBe(false);
    // Neither is La Plata.
    expect(isInside({ lat: -34.9205, lng: -57.9536 }, box)).toBe(false);
  });

  it("names in the caption what it draws", () => {
    for (const town of ["Lanús", "Banfield", "Lomas de Zamora"]) {
      expect(COVERAGE_LABEL).toContain(town);
    }
  });
});
