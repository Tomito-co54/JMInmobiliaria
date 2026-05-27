import { describe, expect, it } from "vitest";
import {
  canPublishProperty,
  ownerPropertyDraftSchema,
  ownerPropertyPublishSchema,
} from "./property";

const COMPLETE_ROW = {
  property_type: "casa",
  operation_type: "venta",
  price_amount: 150000,
  price_currency: "USD",
  partido: "Lomas de Zamora",
  partida: "063056604",
  nomenclatura_catastral: "063010B0000000000000000000000017000003000A",
  address: "Av. Hipolito Yrigoyen 1234",
  photos: ["https://example.com/a.jpg"],
} as const;

describe("ownerPropertyDraftSchema", () => {
  it("accepts an entirely empty payload (draft can be incomplete)", () => {
    const result = ownerPropertyDraftSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      // Defaults applied
      expect(result.data.operation_type).toBe("venta");
      expect(result.data.price_currency).toBe("USD");
    }
  });

  it("normalizes empty strings to null", () => {
    const result = ownerPropertyDraftSchema.safeParse({
      property_type: "",
      description: "",
      surface_total: "",
      address: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.property_type).toBeNull();
      expect(result.data.description).toBeNull();
      expect(result.data.surface_total).toBeNull();
      expect(result.data.address).toBeNull();
    }
  });

  it("coerces stringified numbers to numbers", () => {
    const result = ownerPropertyDraftSchema.safeParse({
      price_amount: "150000",
      surface_total: "85,5",
      rooms: "3",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.price_amount).toBe(150000);
      expect(result.data.surface_total).toBe(85.5);
      expect(result.data.rooms).toBe(3);
    }
  });

  it("rejects unknown partido", () => {
    const result = ownerPropertyDraftSchema.safeParse({
      partido: "La Plata",
    });
    expect(result.success).toBe(false);
  });
});

describe("ownerPropertyPublishSchema", () => {
  it("accepts a complete row", () => {
    const { photos: _omit, ...withoutPhotos } = COMPLETE_ROW;
    const result = ownerPropertyPublishSchema.safeParse(withoutPhotos);
    expect(result.success).toBe(true);
  });

  it("rejects missing price", () => {
    const result = ownerPropertyPublishSchema.safeParse({
      ...COMPLETE_ROW,
      price_amount: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty address", () => {
    const result = ownerPropertyPublishSchema.safeParse({
      ...COMPLETE_ROW,
      address: "   ",
    });
    expect(result.success).toBe(false);
  });
});

describe("canPublishProperty", () => {
  it("greenlights a fully-loaded property", () => {
    expect(canPublishProperty(COMPLETE_ROW)).toEqual({ ok: true, missing: [] });
  });

  it("lists every missing field", () => {
    const empty = {
      property_type: null,
      operation_type: null,
      price_amount: null,
      price_currency: null,
      partido: null,
      partida: null,
      nomenclatura_catastral: null,
      address: null,
      photos: [],
    };
    const result = canPublishProperty(empty);
    expect(result.ok).toBe(false);
    expect(result.missing).toEqual([
      "tipo",
      "operación",
      "precio",
      "moneda",
      "partido",
      "partida",
      "datos de ARBA",
      "dirección",
      "al menos una foto",
    ]);
  });

  it("treats whitespace-only address as missing", () => {
    const result = canPublishProperty({ ...COMPLETE_ROW, address: "   " });
    expect(result.ok).toBe(false);
    expect(result.missing).toContain("dirección");
  });

  it("treats zero price as missing", () => {
    const result = canPublishProperty({ ...COMPLETE_ROW, price_amount: 0 });
    expect(result.ok).toBe(false);
    expect(result.missing).toContain("precio");
  });

  it("treats non-array photos as missing", () => {
    const result = canPublishProperty({ ...COMPLETE_ROW, photos: null });
    expect(result.ok).toBe(false);
    expect(result.missing).toContain("al menos una foto");
  });
});
