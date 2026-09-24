import { describe, expect, it } from "vitest";
import { SERVICE_AREAS } from "./catalogo";

describe("SERVICE_AREAS", () => {
  const services = SERVICE_AREAS.flatMap((a) => a.services);

  it("has unique slugs, since each one is a page anchor", () => {
    const slugs = [...SERVICE_AREAS.map((a) => a.slug), ...services.map((s) => s.slug)];
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("gives every service its own WhatsApp message", () => {
    const messages = services.map((s) => s.message);
    expect(messages.every((m) => m.trim().length > 0)).toBe(true);
    expect(new Set(messages).size).toBe(messages.length);
  });

  it("prints no prices: every job is quoted for the property (Tomy, 24-sep)", () => {
    const text = JSON.stringify(SERVICE_AREAS);
    expect(text).not.toMatch(/\$|USD|\d+\s?%/);
  });
});
