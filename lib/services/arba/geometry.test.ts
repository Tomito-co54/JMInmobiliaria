import { describe, it, expect } from "vitest";
import { parcelCenter } from "./geometry";

/** Shape ARBA actually returns: a MultiPolygon inside a FeatureCollection. */
function fc(geometry: unknown) {
  return { type: "FeatureCollection", features: [{ type: "Feature", geometry }] };
}

const SQUARE = [
  [-58.0, -34.0],
  [-58.0, -34.002],
  [-58.002, -34.002],
  [-58.002, -34.0],
  [-58.0, -34.0],
];

describe("parcelCenter", () => {
  it("centres a Polygon", () => {
    const c = parcelCenter(fc({ type: "Polygon", coordinates: [SQUARE] }));
    expect(c).not.toBeNull();
    expect(c!.lat).toBeCloseTo(-34.0008, 3);
    expect(c!.lng).toBeCloseTo(-58.0008, 3);
  });

  it("centres a MultiPolygon, which is what ARBA sends", () => {
    const c = parcelCenter(fc({ type: "MultiPolygon", coordinates: [[SQUARE]] }));
    expect(c).not.toBeNull();
    expect(c!.lat).toBeCloseTo(-34.0008, 3);
  });

  it("reads GeoJSON's [lng, lat] order, not [lat, lng]", () => {
    // Getting this backwards would put every Zona Sur parcel in the Indian
    // Ocean, so it is worth pinning: latitude here must land near -34, the
    // value that appears second in each pair.
    const c = parcelCenter(fc({ type: "Polygon", coordinates: [SQUARE] }));
    expect(c!.lat).toBeLessThan(-30);
    expect(c!.lng).toBeLessThan(-50);
  });

  it("rounds to six decimals so the cache key doesn't split on float noise", () => {
    const c = parcelCenter(fc({ type: "Polygon", coordinates: [SQUARE] }));
    expect(String(c!.lat).split(".")[1]?.length ?? 0).toBeLessThanOrEqual(6);
  });

  it("returns null for anything it can't read", () => {
    expect(parcelCenter(null)).toBeNull();
    expect(parcelCenter({})).toBeNull();
    expect(parcelCenter({ features: [] })).toBeNull();
    expect(parcelCenter(fc({ type: "Point", coordinates: [-58, -34] }))).toBeNull();
    expect(parcelCenter(fc({ type: "Polygon", coordinates: [] }))).toBeNull();
  });

  it("skips malformed vertices instead of poisoning the average with NaN", () => {
    const c = parcelCenter(
      fc({
        type: "Polygon",
        coordinates: [[[-58.0, -34.0], ["x", "y"], [-58.002, -34.002], [null, 1]]],
      }),
    );
    expect(c).not.toBeNull();
    expect(Number.isFinite(c!.lat)).toBe(true);
  });
});
