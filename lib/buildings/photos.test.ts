import { describe, expect, it } from "vitest";
import { buildingPhoto } from "./photos";

const BELGRANO = "063030B00000000000000000000000150000027000";
const gallery = Array.from({ length: 18 }, (_, i) => `https://x/1A-${i + 1}.jpg`);

describe("buildingPhoto", () => {
  it("finds the registered photo in the unit's current gallery, by its folder number", () => {
    const units = [
      { address: "Belgrano 1287 1°B", photos: ["https://x/1B-1.jpg"] },
      { address: "Belgrano 1287 1°A", photos: gallery },
    ];
    expect(buildingPhoto(BELGRANO, units)).toBe("https://x/1A-18.jpg");
  });

  it("falls back to null rather than a broken image", () => {
    expect(buildingPhoto(BELGRANO, [{ address: "Belgrano 1287 1°A", photos: gallery.slice(0, 5) }])).toBeNull();
    expect(buildingPhoto(BELGRANO, [{ address: "Belgrano 1287 2°A", photos: gallery }])).toBeNull();
    expect(buildingPhoto("otra parcela", [{ address: "Belgrano 1287 1°A", photos: gallery }])).toBeNull();
    expect(buildingPhoto(null, [])).toBeNull();
  });
});

describe("buildingPhoto, a cover of the building's own", () => {
  it("returns the stable URL of the file, whatever the units hold", () => {
    expect(buildingPhoto("063020B00000000000000000000000080000011000", [])).toMatch(
      /property-photos\/edificios\/063020B00000000000000000000000080000011000\.jpg$/,
    );
  });
});
