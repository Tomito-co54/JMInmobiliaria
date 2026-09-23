import { describe, expect, it } from "vitest";
import { PARTIDOS_ZONA_SUR } from "./partidos";
import { LOCALIDADES, LOCALIDADES_POR_PARTIDO, canonicalLocalidad } from "./localidades";

describe("LOCALIDADES_POR_PARTIDO", () => {
  it("covers every partido the site knows", () => {
    expect(Object.keys(LOCALIDADES_POR_PARTIDO).sort()).toEqual([...PARTIDOS_ZONA_SUR].sort());
  });

  it("lists each localidad once in the flat list", () => {
    expect(new Set(LOCALIDADES).size).toBe(LOCALIDADES.length);
  });
});

describe("canonicalLocalidad", () => {
  it("forgives case and accents, not words", () => {
    expect(canonicalLocalidad("banfield")).toBe("Banfield");
    expect(canonicalLocalidad("  LANUS OESTE ")).toBe("Lanús Oeste");
    expect(canonicalLocalidad("Banfiel")).toBeNull();
    expect(canonicalLocalidad("")).toBeNull();
  });

  it("checks the localidad against its partido when there is one", () => {
    expect(canonicalLocalidad("Temperley", "Lomas de Zamora")).toBe("Temperley");
    expect(canonicalLocalidad("Temperley", "Lanús")).toBeNull();
  });

  it("accepts a localidad that straddles two partidos in both", () => {
    expect(canonicalLocalidad("Gerli", "Lanús")).toBe("Gerli");
    expect(canonicalLocalidad("Gerli", "Avellaneda")).toBe("Gerli");
  });

  it("falls back to the whole list for an unknown partido", () => {
    expect(canonicalLocalidad("Adrogué", null)).toBe("Adrogué");
    expect(canonicalLocalidad("Adrogué", "Mar del Plata")).toBe("Adrogué");
  });
});
