import { describe, it, expect } from "vitest";
import {
  decideDeactivation,
  MIN_COVERAGE_RATIO,
  type CrawlEnd,
} from "./crawl-completeness";

const TRUNCATED: CrawlEnd[] = ["property_cap", "page_cap", "page_error"];

describe("decideDeactivation", () => {
  it("allows deactivation only when the crawl reached the end", () => {
    expect(decideDeactivation("exhausted", 120, 100).allowed).toBe(true);
  });

  it.each(TRUNCATED)("refuses after a crawl that stopped early (%s)", (end) => {
    // This is the bug that motivated the module: a run capped at 50 of ~300
    // listings used to mark the other 250 as gone.
    expect(decideDeactivation(end, 50, 50).allowed).toBe(false);
  });

  it("refuses on zero results even when the crawl looks complete", () => {
    // Zonaprop blocking the runner produced exactly this shape: a clean exit
    // with nothing scraped. Deactivating there would wipe the whole partido.
    const decision = decideDeactivation("exhausted", 0, 400);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("zero properties");
  });

  it("explains itself in every branch", () => {
    const ends: CrawlEnd[] = ["exhausted", ...TRUNCATED];
    for (const end of ends) {
      for (const count of [0, 50]) {
        const { reason } = decideDeactivation(end, count, 50);
        expect(reason.length).toBeGreaterThan(20);
      }
    }
  });

  it("names the specific cap that truncated the run", () => {
    expect(decideDeactivation("property_cap", 50, 50).reason).toContain(
      "maxProperties",
    );
    expect(decideDeactivation("page_cap", 50, 50).reason).toContain("maxPages");
  });

  describe("coverage against the active baseline", () => {
    it("refuses the run that actually happened on 31-ago-2026", () => {
      // 41 listings seen, 412 held active, and the crawl believed it had
      // reached the end because a blocked page parses to zero cards exactly
      // like the page after the last result. It deactivated 359; a re-crawl
      // that evening found 208 of them alive.
      const decision = decideDeactivation("exhausted", 41, 412);
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain("41");
      expect(decision.reason).toContain("412");
      expect(decision.reason).toContain("10%");
    });

    it("allows the healthy run from the same night", () => {
      // 242 of 275 active. A working crawl and a blocked one are orders of
      // magnitude apart, which is the whole reason a loose ratio suffices.
      expect(decideDeactivation("exhausted", 242, 275).allowed).toBe(true);
    });

    it("waives the test when there is no baseline to compare against", () => {
      // A first crawl of a new partido holds nothing active, so there is
      // nothing a mistake here could destroy.
      expect(decideDeactivation("exhausted", 3, 0).allowed).toBe(true);
    });

    it("outranks the crawl's own belief that it finished", () => {
      // The point of the guard: `exhausted` is an inference, not an
      // observation, so thin coverage overrules it.
      const thin = decideDeactivation("exhausted", 1, 1000);
      expect(thin.allowed).toBe(false);
      expect(thin.reason).toContain("soft block");
    });

    it("holds the line exactly at the ratio", () => {
      const active = 400;
      const atRatio = active * MIN_COVERAGE_RATIO;
      expect(decideDeactivation("exhausted", atRatio, active).allowed).toBe(true);
      expect(decideDeactivation("exhausted", atRatio - 1, active).allowed).toBe(
        false,
      );
    });

    it("still refuses a truncated crawl that had good coverage", () => {
      // Coverage is an extra condition, not a replacement: seeing most of the
      // catalog says nothing about the pages a 403 stopped us from opening.
      expect(decideDeactivation("page_error", 380, 400).allowed).toBe(false);
    });
  });
});
