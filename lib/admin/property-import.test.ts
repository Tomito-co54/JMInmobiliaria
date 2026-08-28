import { describe, it, expect } from "vitest";
import { parseImportPayload, mimeForPhoto, isRemotePhoto } from "./property-import";

const VALID = {
  address: "Belgrano 1290",
  partido: "Lomas de Zamora",
  partida: "063-47850-2",
  property_type: "casa",
  operation_type: "venta",
  price_amount: 85000,
  price_currency: "USD",
  photos: ["fotos/frente.jpg"],
};

describe("mimeForPhoto", () => {
  it("accepts what the bucket accepts", () => {
    expect(mimeForPhoto("a/b/frente.jpg")).toBe("image/jpeg");
    expect(mimeForPhoto("FRENTE.JPEG")).toBe("image/jpeg");
    expect(mimeForPhoto("x.png")).toBe("image/png");
    expect(mimeForPhoto("x.webp")).toBe("image/webp");
  });

  it("rejects everything else", () => {
    expect(mimeForPhoto("plano.pdf")).toBeNull();
    expect(mimeForPhoto("video.mp4")).toBeNull();
    expect(mimeForPhoto("sin-extension")).toBeNull();
  });

  it("ignores a query string on a remote photo", () => {
    expect(mimeForPhoto("https://x.com/foto.jpg?width=800")).toBe("image/jpeg");
  });
});

describe("isRemotePhoto", () => {
  it("tells a URL from a path", () => {
    expect(isRemotePhoto("https://x.com/a.jpg")).toBe(true);
    expect(isRemotePhoto("C:/fotos/a.jpg")).toBe(false);
    expect(isRemotePhoto("./a.jpg")).toBe(false);
  });
});

describe("parseImportPayload", () => {
  it("accepts a complete property", () => {
    const r = parseImportPayload(VALID);
    expect(r.ok).toBe(true);
    expect(r.payload!.partida).toBe("063-47850-2");
    expect(r.payload!.photos).toHaveLength(1);
    expect(r.payload!.row.price_amount).toBe(85000);
  });

  // The failure this guards against is the quiet one: a misspelled key is
  // dropped by the schema, the run reports success, and the property lands
  // in the catalog missing its price.
  it("refuses an unknown field instead of dropping it", () => {
    const r = parseImportPayload({ ...VALID, precio: 85000 });
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toContain("precio");
  });

  it("rejects a partido outside Zona Sur", () => {
    const r = parseImportPayload({ ...VALID, partido: "Vicente López" });
    expect(r.ok).toBe(false);
  });

  it("rejects a photo the bucket would refuse", () => {
    const r = parseImportPayload({ ...VALID, photos: ["escritura.pdf"] });
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toContain("escritura.pdf");
  });

  it("warns, but allows, a draft with no photos or partida", () => {
    const rest = { ...VALID } as Partial<typeof VALID>;
    delete rest.partida;
    delete rest.photos;
    const r = parseImportPayload(rest);
    expect(r.ok).toBe(true);
    expect(r.warnings.join(" ")).toContain("fotos");
    expect(r.warnings.join(" ")).toContain("partida");
  });

  it("does not treat is_featured as an unknown field", () => {
    const r = parseImportPayload({ ...VALID, is_featured: true });
    expect(r.ok).toBe(true);
    expect(r.payload!.isFeatured).toBe(true);
  });

  it("rejects a price that isn't a number", () => {
    const r = parseImportPayload({ ...VALID, price_amount: "ochenta mil" });
    expect(r.ok).toBe(false);
  });

  it("refuses anything that isn't an object", () => {
    expect(parseImportPayload([VALID]).ok).toBe(false);
    expect(parseImportPayload("texto").ok).toBe(false);
    expect(parseImportPayload(null).ok).toBe(false);
  });
});
