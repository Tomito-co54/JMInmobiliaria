import { describe, expect, it } from "vitest";
import {
  getArbaCodeForPartido,
  getPartidoForArbaCode,
  PARTIDOS_ZONA_SUR,
  PARTIDOS_ZONA_SUR_ENTRIES,
  validatePartida,
} from "./partidos";

describe("partidos — ARBA code mapping", () => {
  it("PARTIDOS_ZONA_SUR (string array) preserves the entries' names in order", () => {
    expect(PARTIDOS_ZONA_SUR).toEqual(
      PARTIDOS_ZONA_SUR_ENTRIES.map((p) => p.name),
    );
  });

  it("getArbaCodeForPartido returns the canonical 3-digit code", () => {
    expect(getArbaCodeForPartido("Lomas de Zamora")).toBe("063");
    expect(getArbaCodeForPartido("Avellaneda")).toBe("003");
    expect(getArbaCodeForPartido("Quilmes")).toBe("091");
  });

  it("getArbaCodeForPartido returns null for unknown partido", () => {
    expect(getArbaCodeForPartido("La Plata")).toBeNull();
  });

  it("getPartidoForArbaCode is the inverse mapping", () => {
    expect(getPartidoForArbaCode("063")).toBe("Lomas de Zamora");
    expect(getPartidoForArbaCode("003")).toBe("Avellaneda");
    expect(getPartidoForArbaCode("999")).toBeNull();
  });

  it("all 7 entries have a unique 3-digit code", () => {
    const codes = PARTIDOS_ZONA_SUR_ENTRIES.map((p) => p.arbaCode);
    expect(new Set(codes).size).toBe(codes.length);
    for (const code of codes) {
      expect(code).toMatch(/^\d{3}$/);
    }
  });
});

describe("validatePartida", () => {
  it("accepts a clean 9-digit partida that matches the partido", () => {
    const result = validatePartida("Lomas de Zamora", "063056604");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.normalized).toBe("063056604");
      expect(result.arbaCode).toBe("063");
    }
  });

  it("normalizes separators (dashes, spaces, dots)", () => {
    const dashed = validatePartida("Lomas de Zamora", "063-056-604");
    const spaced = validatePartida("Lomas de Zamora", "063 056 604");
    const dotted = validatePartida("Lomas de Zamora", "063.056.604");
    expect(dashed.ok && dashed.normalized).toBe("063056604");
    expect(spaced.ok && spaced.normalized).toBe("063056604");
    expect(dotted.ok && dotted.normalized).toBe("063056604");
  });

  it("rejects empty string with reason=empty", () => {
    const result = validatePartida("Lomas de Zamora", "   ");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("empty");
  });

  it("rejects non-numeric or wrong-length input with reason=format", () => {
    expect(validatePartida("Lomas de Zamora", "abc")).toMatchObject({
      ok: false,
      reason: "format",
    });
    expect(validatePartida("Lomas de Zamora", "12345")).toMatchObject({
      ok: false,
      reason: "format",
    });
    expect(validatePartida("Lomas de Zamora", "1234567890")).toMatchObject({
      ok: false,
      reason: "format",
    });
  });

  it("rejects unknown partido", () => {
    const result = validatePartida("La Plata", "063056604");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unknown_partido");
  });

  it("rejects prefix mismatch and hints at the correct partido", () => {
    // 091 = Quilmes; partido provided = Lomas (063). Mismatch.
    const result = validatePartida("Lomas de Zamora", "091002138");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("prefix_mismatch");
      expect(result.message).toContain("Quilmes");
    }
  });

  it("prefix mismatch with unknown prefix has no hint", () => {
    const result = validatePartida("Lomas de Zamora", "999000000");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("prefix_mismatch");
      expect(result.message).not.toContain("corresponde a");
    }
  });
});
