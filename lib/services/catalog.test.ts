import { describe, expect, it } from "vitest";
import {
  getServiceDefinition,
  listAllServices,
  listAvailableServices,
} from "./catalog";

describe("catalog", () => {
  it("returns the definition for cadastral_report", () => {
    const def = getServiceDefinition("cadastral_report");
    expect(def.id).toBe("cadastral_report");
    expect(def.title).toContain("Catastral");
    expect(def.price).toBeGreaterThan(0);
    expect(def.currency).toBe("ARS");
  });

  it("throws on unknown service type", () => {
    expect(() => getServiceDefinition("nonexistent" as never)).toThrow();
  });

  it("only cadastral_report is available in MVP", () => {
    const avail = listAvailableServices();
    expect(avail).toHaveLength(1);
    expect(avail[0].id).toBe("cadastral_report");
  });

  it("listAllServices returns all definitions including unavailable", () => {
    const all = listAllServices();
    expect(all.length).toBeGreaterThan(1);
    expect(all.some((s) => s.available === false)).toBe(true);
  });

  it("every service has a price and a sla string", () => {
    for (const s of listAllServices()) {
      expect(s.price).toBeGreaterThan(0);
      expect(s.sla).toBeTruthy();
      expect(s.highlights.length).toBeGreaterThan(0);
    }
  });
});
