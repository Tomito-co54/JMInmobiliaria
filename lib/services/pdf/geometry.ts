/**
 * Polygon helpers — converts ARBA's GeoJSON polygon into points suitable
 * for an SVG viewport. Independent of @react-pdf so it stays testable.
 */

export interface BoundingBox {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
}

export function getBoundingBox(rings: number[][][]): BoundingBox | null {
  let minLng = Infinity,
    maxLng = -Infinity,
    minLat = Infinity,
    maxLat = -Infinity;
  let any = false;
  for (const ring of rings) {
    for (const [lng, lat] of ring) {
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      any = true;
    }
  }
  if (!any) return null;
  return { minLng, maxLng, minLat, maxLat };
}

/**
 * Extract all polygon rings (outer + holes) from a GeoJSON geometry.
 * Supports Polygon and MultiPolygon. Returns an array of rings (each
 * ring is an array of [lng, lat] pairs).
 */
export function extractRings(geometry: unknown): number[][][] {
  if (!geometry || typeof geometry !== "object") return [];
  const g = geometry as {
    type?: string;
    coordinates?: unknown;
  };
  if (g.type === "Polygon" && Array.isArray(g.coordinates)) {
    return g.coordinates as number[][][];
  }
  if (g.type === "MultiPolygon" && Array.isArray(g.coordinates)) {
    return (g.coordinates as number[][][][]).flat();
  }
  return [];
}

/**
 * Maps each [lng, lat] in a ring to [x, y] within a viewport of
 * (width, height) with optional padding. Maintains aspect ratio
 * (square pixels — meters per degree differs by latitude, so we adjust
 * lng scale by cos(lat)).
 */
export function projectRing(
  ring: number[][],
  bbox: BoundingBox,
  viewport: { width: number; height: number; padding?: number },
): { x: number; y: number }[] {
  const padding = viewport.padding ?? 8;
  const innerW = viewport.width - padding * 2;
  const innerH = viewport.height - padding * 2;

  // Adjust lng span by cos(midLat) so 1 unit of lng ≈ 1 unit of lat
  // visually (avoids horizontal stretching in mid-latitudes).
  const midLat = (bbox.minLat + bbox.maxLat) / 2;
  const cos = Math.cos((midLat * Math.PI) / 180);
  const lngSpan = (bbox.maxLng - bbox.minLng) * cos;
  const latSpan = bbox.maxLat - bbox.minLat;
  if (lngSpan === 0 || latSpan === 0) {
    return ring.map(() => ({ x: viewport.width / 2, y: viewport.height / 2 }));
  }

  const scale = Math.min(innerW / lngSpan, innerH / latSpan);
  const renderedW = lngSpan * scale;
  const renderedH = latSpan * scale;
  const offsetX = padding + (innerW - renderedW) / 2;
  const offsetY = padding + (innerH - renderedH) / 2;

  return ring.map(([lng, lat]) => ({
    x: offsetX + (lng - bbox.minLng) * cos * scale,
    // y flipped: lat grows north (up), SVG y grows down
    y: offsetY + (bbox.maxLat - lat) * scale,
  }));
}
