import { describe, it, expect } from "vitest";
import { decideDeactivation, type CrawlEnd } from "./crawl-completeness";

const TRUNCATED: CrawlEnd[] = ["property_cap", "page_cap", "page_error"];

describe("decideDeactivation", () => {
  it("allows deactivation only when the crawl reached the end", () => {
    expect(decideDeactivation("exhausted", 120).allowed).toBe(true);
  });

  it.each(TRUNCATED)("refuses after a crawl that stopped early (%s)", (end) => {
    // This is the bug that motivated the module: a run capped at 50 of ~300
    // listings used to mark the other 250 as gone.
    expect(decideDeactivation(end, 50).allowed).toBe(false);
  });

  it("refuses on zero results even when the crawl looks complete", () => {
    // Zonaprop blocking the runner produced exactly this shape: a clean exit
    // with nothing scraped. Deactivating there would wipe the whole partido.
    const decision = decideDeactivation("exhausted", 0);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("zero properties");
  });

  it("explains itself in every branch", () => {
    const ends: CrawlEnd[] = ["exhausted", ...TRUNCATED];
    for (const end of ends) {
      for (const count of [0, 50]) {
        const { reason } = decideDeactivation(end, count);
        expect(reason.length).toBeGreaterThan(20);
      }
    }
  });

  it("names the specific cap that truncated the run", () => {
    expect(decideDeactivation("property_cap", 50).reason).toContain("maxProperties");
    expect(decideDeactivation("page_cap", 50).reason).toContain("maxPages");
  });
});
