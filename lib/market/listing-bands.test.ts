import { describe, it, expect } from "vitest";
import {
  describeAge,
  describePriceVsMarket,
  listingAgeDays,
  AGE_STALE_DAYS,
  PRICE_DEVIATION_PCT,
} from "./listing-bands";

describe("describeAge", () => {
  it("escalates as a listing sits", () => {
    const fresh = describeAge(10);
    const stale = describeAge(100);
    const veryStale = describeAge(200);
    expect(fresh.className).toContain("muted");
    expect(stale.className).toContain("orange");
    expect(veryStale.className).toContain("red");
  });

  it("treats the thresholds as exclusive", () => {
    // Exactly 90 days is not yet "past three months".
    expect(describeAge(AGE_STALE_DAYS).className).toContain("amber");
    expect(describeAge(AGE_STALE_DAYS + 1).className).toContain("orange");
  });

  it("says how many days in the tooltip", () => {
    expect(describeAge(45).title).toContain("45 días");
  });

  it("stays neutral without a date", () => {
    expect(describeAge(null)).toEqual({ className: "", title: "" });
  });
});

describe("describePriceVsMarket", () => {
  const MEDIAN = 2000;

  it("colours only what is far from the median", () => {
    // Within the band, deliberately quiet — most listings sit here and
    // colouring them would make the column unreadable.
    expect(describePriceVsMarket(2200, MEDIAN).className).toContain("muted");
    expect(describePriceVsMarket(3000, MEDIAN).className).toContain("red");
    expect(describePriceVsMarket(1000, MEDIAN).className).toContain("emerald");
  });

  it("scores against the median of the type, not an absolute number", () => {
    // 900 USD/m² is dear for a lote and cheap for a departamento. Same
    // input, opposite readings.
    expect(describePriceVsMarket(900, 500).className).toContain("red");
    expect(describePriceVsMarket(900, 2000).className).toContain("emerald");
  });

  it("explains the distance in the tooltip", () => {
    expect(describePriceVsMarket(3000, MEDIAN).title).toContain("50% sobre");
    expect(describePriceVsMarket(1000, MEDIAN).title).toContain("50% bajo");
  });

  it("uses the boundary as exclusive", () => {
    const atEdge = MEDIAN * (1 + PRICE_DEVIATION_PCT / 100);
    expect(describePriceVsMarket(atEdge, MEDIAN).className).toContain("muted");
  });

  it("stays neutral when either side is missing", () => {
    expect(describePriceVsMarket(null, MEDIAN)).toEqual({ className: "", title: "" });
    expect(describePriceVsMarket(2000, null)).toEqual({ className: "", title: "" });
    expect(describePriceVsMarket(2000, 0)).toEqual({ className: "", title: "" });
  });
});

describe("listingAgeDays", () => {
  const daysAgo = (n: number) =>
    new Date(Date.now() - n * 86_400_000).toISOString();

  it("counts from when the crawler first saw a scraped listing", () => {
    expect(listingAgeDays({ first_seen_at: daysAgo(40) })).toBe(40);
  });

  it("falls back to created_at for owner properties, which are never scraped", () => {
    expect(listingAgeDays({ first_seen_at: null, created_at: daysAgo(7) })).toBe(7);
  });

  it("prefers first_seen_at when both exist", () => {
    expect(
      listingAgeDays({ first_seen_at: daysAgo(90), created_at: daysAgo(3) }),
    ).toBe(90);
  });

  it("is null with no dates at all", () => {
    expect(listingAgeDays({})).toBeNull();
  });
});
