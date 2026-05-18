import { describe, expect, it } from "vitest";
import { getScoreBand, interpolateRingColor } from "./bands";

describe("getScoreBand", () => {
  it.each([
    [0, "low", "Insuficiente"],
    [15, "low", "Insuficiente"],
    [19, "low", "Insuficiente"],
    [20, "improvable", "Mejorable"],
    [35, "improvable", "Mejorable"],
    [36, "acceptable", "Aceptable"],
    [55, "acceptable", "Aceptable"],
    [56, "good", "Bueno"],
    [75, "good", "Bueno"],
    [76, "very_good", "Muy bueno"],
    [94, "very_good", "Muy bueno"],
    [95, "exceptional", "Excepcional"],
    [100, "exceptional", "Excepcional"],
  ])("score %d → %s (%s)", (score, expectedId, expectedLabel) => {
    const band = getScoreBand(score);
    expect(band.id).toBe(expectedId);
    expect(band.label).toBe(expectedLabel);
  });

  it("clamps out-of-range values into the closest band", () => {
    expect(getScoreBand(-10).id).toBe("low");
    expect(getScoreBand(200).id).toBe("exceptional");
  });

  it("returns the insufficient band for null/undefined", () => {
    expect(getScoreBand(null).id).toBe("insufficient");
    expect(getScoreBand(undefined).id).toBe("insufficient");
  });

  it("rounds fractional scores before classifying", () => {
    expect(getScoreBand(19.4).id).toBe("low");
    expect(getScoreBand(19.6).id).toBe("improvable");
  });
});

describe("interpolateRingColor", () => {
  it("returns the gold hex for score >= 95", () => {
    expect(interpolateRingColor(95).toLowerCase()).toBe("#d4a24c");
    expect(interpolateRingColor(100).toLowerCase()).toBe("#d4a24c");
  });

  it("returns the muted gray for null score", () => {
    expect(interpolateRingColor(null).toLowerCase()).toBe("#94a3b8");
  });

  it("returns pure red at the bottom stop", () => {
    expect(interpolateRingColor(10).toLowerCase()).toBe("#dc2626");
    // Below the first stop also clamps to red.
    expect(interpolateRingColor(0).toLowerCase()).toBe("#dc2626");
  });

  it("returns pure green at the top of the pre-gold range", () => {
    expect(interpolateRingColor(85).toLowerCase()).toBe("#16a34a");
  });

  it("interpolates smoothly between two adjacent stops", () => {
    // Halfway between red (10) and orange (28) → at 19, expect mid color.
    const red = "#dc2626"; // (220, 38, 38)
    const orange = "#f97316"; // (249, 115, 22)
    const mid = interpolateRingColor(19);
    // Crude sanity: mid should NOT equal either endpoint.
    expect(mid.toLowerCase()).not.toBe(red);
    expect(mid.toLowerCase()).not.toBe(orange);
    // Channels should be between the two endpoints.
    const r = parseInt(mid.slice(1, 3), 16);
    const g = parseInt(mid.slice(3, 5), 16);
    const b = parseInt(mid.slice(5, 7), 16);
    expect(r).toBeGreaterThan(0xdc); // 220 → 249, increasing
    expect(r).toBeLessThan(0xf9);
    expect(g).toBeGreaterThan(0x26); // 38 → 115, increasing
    expect(g).toBeLessThan(0x73);
    expect(b).toBeLessThan(0x26); // 38 → 22, decreasing
    expect(b).toBeGreaterThan(0x16);
  });
});
