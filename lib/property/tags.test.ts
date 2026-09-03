import { describe, expect, it } from "vitest";
import {
  PROPERTY_TAGS,
  isPropertyTag,
  orderTags,
  readTags,
  tagEmphasis,
  tagLabel,
} from "./tags";

describe("property tags", () => {
  it("every tag has a label a visitor can read", () => {
    for (const tag of PROPERTY_TAGS) {
      expect(tagLabel(tag)).toMatch(/^[A-Z]/);
      expect(tagLabel(tag)).not.toContain("_");
    }
  });

  it("only the price claim gets the emphasis", () => {
    expect(PROPERTY_TAGS.filter(tagEmphasis)).toEqual(["oferta"]);
  });

  it("tells a tag from any other string", () => {
    expect(isPropertyTag("oferta")).toBe(true);
    expect(isPropertyTag("Oferta")).toBe(false);
    expect(isPropertyTag("")).toBe(false);
    expect(isPropertyTag(null)).toBe(false);
  });

  it("orders canonically and drops repeats, whichever order they were clicked in", () => {
    expect(orderTags(["a_estrenar", "oferta", "a_estrenar"])).toEqual([
      "oferta",
      "a_estrenar",
    ]);
  });

  it("keeps an unknown value so the schema can refuse it out loud", () => {
    expect(orderTags(["remate", "oferta"])).toEqual(["oferta", "remate"]);
  });

  it("reads a database value defensively", () => {
    expect(readTags(null)).toEqual([]);
    expect(readTags("oferta")).toEqual([]);
    expect(readTags(["oferta", 3, "x", "apto_comercial"])).toEqual([
      "apto_comercial",
      "oferta",
    ]);
  });
});
