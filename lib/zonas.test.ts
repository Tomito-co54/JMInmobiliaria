import { describe, expect, it } from "vitest";
import { ZONAS, pickCover, zonaByKey, zonaOfPartido, zoneCovers, type CoverCandidate } from "./zonas";

function row(over: Partial<CoverCandidate> & { id: string }): CoverCandidate & { id: string } {
  return {
    source: "colega",
    partido: "Lomas de Zamora",
    tags: [],
    price_amount: 100_000,
    price_currency: "USD",
    is_featured: false,
    created_at: "2026-09-01T00:00:00Z",
    photos: ["a.jpg"],
    ...over,
  };
}

describe("zonas", () => {
  it("maps every Zona Sur partido, Calamuchita and the coast to a zone, once each", () => {
    expect(zonaOfPartido("Lomas de Zamora")?.key).toBe("buenos-aires");
    expect(zonaOfPartido("Calamuchita")?.key).toBe("cordoba");
    expect(zonaOfPartido("Pinamar")?.key).toBe("la-costa");
    expect(zonaOfPartido("Mar del Plata")).toBeNull();
    const all = ZONAS.flatMap((z) => z.partidos);
    expect(new Set(all).size).toBe(all.length);
    expect(zonaByKey("cordoba")?.name).toBe("Córdoba");
    expect(zonaByKey("x")).toBeNull();
  });
});

describe("pickCover", () => {
  const now = new Date("2026-09-25T12:00:00Z");

  it("prefers the family's cheapest offer, then its starred listing", () => {
    const rows = [
      row({ id: "partner-offer", tags: ["oferta"], price_amount: 40_000 }),
      row({ id: "own-offer", source: "owner_direct", tags: ["oferta"], price_amount: 69_500 }),
      row({ id: "own-star", source: "owner_direct", is_featured: true }),
    ];
    expect(pickCover(rows, now)?.id).toBe("own-offer");
    expect(pickCover(rows.filter((r) => r.id !== "own-offer"), now)?.id).toBe("own-star");
  });

  it("falls back to anyone's cheapest offer, then to the dearest with a gallery, then to the newest", () => {
    const rows = [
      row({ id: "old", created_at: "2026-08-01T00:00:00Z", price_amount: 90_000, photos: ["a", "b", "c"] }),
      row({ id: "new", created_at: "2026-09-20T00:00:00Z", price_amount: null, photos: ["a", "b"] }),
      row({ id: "dear", created_at: "2026-09-01T00:00:00Z", price_amount: 350_000, photos: ["a", "b", "c", "d"] }),
      row({ id: "offer", tags: ["oferta"], price_amount: 50_000 }),
    ];
    expect(pickCover(rows, now)?.id).toBe("offer");
    const noOffer = rows.filter((r) => r.id !== "offer");
    expect(pickCover(noOffer, now)?.id).toBe("dear");
    // A bare lot with two photos and no price fronts nothing while there is a house.
    expect(pickCover(noOffer.filter((r) => r.id !== "dear" && r.id !== "old"), now)?.id).toBe("new");
  });

  it("never fronts a zone with a listing that has no photos", () => {
    expect(pickCover([row({ id: "bare", source: "owner_direct", tags: ["oferta"], photos: [] })], now)).toBeNull();
  });
});

describe("zoneCovers", () => {
  it("gives one cover per zone with something published, in the zones' order, with the zone's count", () => {
    const rows = [
      row({ id: "vdq-1", partido: "Calamuchita" }),
      row({ id: "vdq-2", partido: "Calamuchita", created_at: "2026-09-25T00:00:00Z" }),
      row({ id: "bsas", source: "owner_direct", partido: "Lomas de Zamora" }),
      row({ id: "elsewhere", partido: "Mar del Plata" }),
    ];
    const covers = zoneCovers(rows, new Date("2026-09-25T12:00:00Z"));
    expect(covers.map((c) => [c.zona.key, c.cover.id, c.count])).toEqual([
      ["buenos-aires", "bsas", 1],
      ["cordoba", "vdq-2", 2],
    ]);
  });
});
