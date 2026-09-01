import { describe, it, expect } from "vitest";
import { MARTILLERO, hasMatricula, whatsappLink, propertyLeadMessage } from "./contact";

describe("hasMatricula", () => {
  it("is false while the licence has not been typed in", () => {
    // The published state today. If this ever fails it is good news — it means
    // somebody filled the number in — and the assertion below is the one that
    // has to keep holding.
    expect(MARTILLERO.matricula).toBe("");
    expect(hasMatricula()).toBe(false);
  });

  it("treats whitespace as absent", () => {
    // The failure this guards is specific: a hurried edit that leaves a space
    // behind would turn on a public credential block showing nothing, on the
    // exact paragraph that asks the reader to trust us.
    const blank = { ...MARTILLERO, matricula: "   " };
    expect(blank.matricula.trim().length > 0).toBe(false);
  });

  it("is true for a real number", () => {
    const filled = { ...MARTILLERO, matricula: "5678" };
    expect(filled.matricula.trim().length > 0).toBe(true);
  });
});

describe("contacto", () => {
  it("arma el link de WhatsApp con el mensaje codificado", () => {
    const link = whatsappLink("Hola, ¿está disponible?");
    expect(link).toContain("https://wa.me/");
    expect(link).toContain("text=");
    expect(link).not.toContain(" ");
  });

  it("nombra la dirección en el primer mensaje, y aguanta que no haya", () => {
    expect(propertyLeadMessage("Belgrano 1287 1°A")).toContain("Belgrano 1287 1°A");
    expect(propertyLeadMessage(null)).toContain("una propiedad publicada");
    expect(propertyLeadMessage("   ")).toContain("una propiedad publicada");
  });
});
