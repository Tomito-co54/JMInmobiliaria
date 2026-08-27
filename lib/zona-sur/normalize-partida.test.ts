import { describe, it, expect } from "vitest";
import { normalizePartida, validatePartida } from "./partidos";

describe("normalizePartida", () => {
  it("pads a parcel number written without its leading zeros", () => {
    // The bug this module exists for. A Lomas de Zamora tax bill reads
    // "063-47850-2"; stripping separators gives 063478502, which is nine
    // digits and looks fine but is a parcel that does not exist. ARBA knows
    // this one as 063047850, and confirmed it: 239.23 m², Urbano.
    expect(normalizePartida("063-47850-2")).toBe("063047850");
  });

  it("accepts the same partida however it was written", () => {
    const forms = [
      "063-47850-2",
      "063-047850-2",
      "063 47850 2",
      "063.047850.2",
      "063-047850",
      "063 47850",
      "063047850",
      "0630478502",
    ];
    for (const form of forms) {
      expect(normalizePartida(form), form).toBe("063047850");
    }
  });

  it("drops the check digit, which is not part of ARBA's key", () => {
    expect(normalizePartida("063-047850-2")).toBe("063047850");
    expect(normalizePartida("063-047850-9")).toBe("063047850");
  });

  it("rejects what it cannot read as a partida", () => {
    expect(normalizePartida("")).toBeNull();
    expect(normalizePartida("   ")).toBeNull();
    expect(normalizePartida("abc-def-g")).toBeNull();
    expect(normalizePartida("63-47850-2")).toBeNull(); // partido must be 3 digits
    expect(normalizePartida("063-1234567-2")).toBeNull(); // parcel too long
    expect(normalizePartida("063-47850-2-9")).toBeNull(); // too many groups
    expect(normalizePartida("063-47850-22")).toBeNull(); // check digit is one digit
    expect(normalizePartida("06304785")).toBeNull(); // 8 digits, ambiguous
  });
});

describe("validatePartida with the real-world format", () => {
  it("passes the grouped form and hands back ARBA's key", () => {
    const result = validatePartida("Lomas de Zamora", "063-47850-2");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.normalized).toBe("063047850");
  });

  it("still catches a partida from the wrong partido", () => {
    const result = validatePartida("Lanús", "063-47850-2");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("prefix_mismatch");
  });
});
