import { describe, expect, it } from "vitest";
import { canGoBackInApp, nextTrail } from "./in-app-history";

function walk(paths: string[]): string[] {
  return paths.reduce<string[]>((t, p) => nextTrail(t, p), []);
}

describe("nextTrail", () => {
  it("a landing on a listing has nowhere in the site to go back to", () => {
    expect(canGoBackInApp(walk(["/p/1"]))).toBe(false);
  });

  it("catalog → listing can go back to the catalog", () => {
    expect(walk(["/propiedades", "/p/1"])).toEqual(["/propiedades", "/p/1"]);
    expect(canGoBackInApp(walk(["/propiedades", "/p/1"]))).toBe(true);
  });

  it("returning to the entry below is a pop, not a push", () => {
    expect(walk(["/propiedades", "/p/1", "/propiedades"])).toEqual(["/propiedades"]);
  });

  it("from a shared link, a second listing and back: the first one cannot leave the site", () => {
    const trail = walk(["/p/1", "/p/2", "/p/1"]);
    expect(trail).toEqual(["/p/1"]);
    expect(canGoBackInApp(trail)).toBe(false);
  });

  it("the same path twice (a query-string rewrite) is not a new entry", () => {
    expect(walk(["/propiedades", "/propiedades"])).toEqual(["/propiedades"]);
  });
});
