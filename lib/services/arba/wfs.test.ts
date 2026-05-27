import { afterEach, describe, expect, it, vi } from "vitest";
import { getParcelByPartida } from "./wfs";

/**
 * Tests for the by-partida WFS lookup. Mocks global fetch — we never hit
 * the real ARBA endpoint from CI.
 */

interface FetchCallSpy {
  url: string;
  params: URLSearchParams;
}

function mockFetchOnce(response: unknown, capture?: FetchCallSpy[]): void {
  const mock = vi.fn(async (input: unknown) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    if (capture) {
      const parsed = new URL(url);
      capture.push({ url, params: parsed.searchParams });
    }
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  globalThis.fetch = mock as unknown as typeof fetch;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getParcelByPartida", () => {
  it("returns null when ARBA finds no parcel for the partida", async () => {
    mockFetchOnce({
      type: "FeatureCollection",
      features: [],
      numberReturned: 0,
      totalFeatures: 0,
    });
    const result = await getParcelByPartida("999999999");
    expect(result).toBeNull();
  });

  it("parses a successful response into a ParcelResult", async () => {
    mockFetchOnce({
      type: "FeatureCollection",
      numberReturned: 1,
      totalFeatures: 1,
      features: [
        {
          type: "Feature",
          properties: {
            pda: "063056604",
            cca: "063010B0000000000000000000000017000003000A",
            ara1: "521,13",
            tpa: "Urbano",
          },
        },
      ],
    });
    const result = await getParcelByPartida("063056604");
    expect(result).not.toBeNull();
    expect(result?.partida).toBe("063056604");
    expect(result?.nomenclatura).toBe(
      "063010B0000000000000000000000017000003000A",
    );
    expect(result?.surfaceM2).toBeCloseTo(521.13);
    expect(result?.tipo).toBe("Urbano");
    expect(result?.matchStrategy).toBe("by_partida");
    expect(result?.distanceMeters).toBe(0);
  });

  it("uses the pda CQL filter (not geometric)", async () => {
    const calls: FetchCallSpy[] = [];
    mockFetchOnce(
      { type: "FeatureCollection", features: [], numberReturned: 0, totalFeatures: 0 },
      calls,
    );
    await getParcelByPartida("063056604");
    expect(calls.length).toBe(1);
    const cql = calls[0].params.get("CQL_FILTER");
    expect(cql).toBe("pda='063056604'");
    // Geometric filters should NOT be present.
    expect(cql).not.toContain("INTERSECTS");
    expect(cql).not.toContain("DWITHIN");
  });

  it("escapes single quotes in partida defensively", async () => {
    const calls: FetchCallSpy[] = [];
    mockFetchOnce(
      { type: "FeatureCollection", features: [], numberReturned: 0, totalFeatures: 0 },
      calls,
    );
    await getParcelByPartida("063'OR'1=1");
    expect(calls.length).toBe(1);
    expect(calls[0].params.get("CQL_FILTER")).toBe("pda='063''OR''1=1'");
  });
});
