import { describe, it, expect } from "vitest";
import { cheapestOffer, isOnOffer } from "./offers";

const usd = (id: string, price: number | null, tags: string[] = ["oferta"]) => ({
  id,
  tags,
  price_amount: price,
  price_currency: "USD" as const,
});

describe("isOnOffer", () => {
  it("is the oferta tag and nothing else", () => {
    expect(isOnOffer(["oferta"])).toBe(true);
    expect(isOnOffer(["a_estrenar"])).toBe(false);
    expect(isOnOffer(null)).toBe(false);
  });
});

describe("cheapestOffer", () => {
  it("returns null when nothing is on offer", () => {
    expect(cheapestOffer([usd("a", 80000, []), usd("b", 96000, ["a_estrenar"])])).toBeNull();
  });

  it("picks the cheapest of several offers", () => {
    const rows = [usd("a", 80000), usd("b", 69900), usd("c", 72000)];
    expect(cheapestOffer(rows)?.id).toBe("b");
  });

  it("ignores a listing on offer without a price", () => {
    expect(cheapestOffer([usd("a", null), usd("b", 72000)])?.id).toBe("b");
    expect(cheapestOffer([usd("a", null)])).toBeNull();
  });

  it("never compares pesos against dollars: dollars win when any exist", () => {
    const ars = { id: "r", tags: ["oferta"], price_amount: 1_900_000, price_currency: "ARS" as const };
    expect(cheapestOffer([ars, usd("d", 69900)])?.id).toBe("d");
    expect(cheapestOffer([ars])?.id).toBe("r");
  });

  it("keeps the first on a tie so the caller's order decides", () => {
    expect(cheapestOffer([usd("a", 70000), usd("b", 70000)])?.id).toBe("a");
  });
});
