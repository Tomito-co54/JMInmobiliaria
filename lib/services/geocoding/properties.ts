import { getAdminClient } from "./client";
import { geocodeAddress } from "./index";

/**
 * Bridges geocodeAddress() and the properties table: if a property already has
 * lat/lng, returns them; otherwise builds a Nominatim-friendly query from the
 * address + partido, geocodes it, and writes the result back to the row.
 *
 * Idempotent — safe to call repeatedly. The cache layer absorbs the cost.
 */

export type EnsureCoordsResult =
  | {
      ok: true;
      lat: number;
      lng: number;
      /** "existing" = already had coords; "cache" = hit in geocoding_cache;
       *  "nominatim" = fresh fetch from the network. */
      source: "existing" | "cache" | "nominatim";
      displayName?: string;
    }
  | {
      ok: false;
      /** "no_address" = the property has no address text to query;
       *  "not_found" = Nominatim found no match for the query. */
      reason: "no_address" | "not_found";
    };

interface PropertyRow {
  id: string;
  address: string | null;
  partido: string | null;
  lat: number | null;
  lng: number | null;
}

/**
 * Build a Nominatim query string from a raw address + partido. We always
 * suffix "Buenos Aires, Argentina" because many Argentine street names also
 * exist in Spain, Chile, or other parts of Argentina; bare addresses like
 * "San Martín 100" otherwise resolve unpredictably.
 */
function buildQuery(address: string, partido: string | null): string {
  const parts: string[] = [address.trim()];
  if (partido && !address.toLowerCase().includes(partido.toLowerCase())) {
    parts.push(partido);
  }
  parts.push("Buenos Aires", "Argentina");
  return parts.join(", ");
}

export async function ensurePropertyCoordinates(
  propertyId: string,
): Promise<EnsureCoordsResult> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from("properties")
    .select("id, address, partido, lat, lng")
    .eq("id", propertyId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error(`Property not found: ${propertyId}`);

  const property = data as unknown as PropertyRow;

  if (property.lat !== null && property.lng !== null) {
    return {
      ok: true,
      lat: property.lat,
      lng: property.lng,
      source: "existing",
    };
  }

  if (!property.address || property.address.trim().length === 0) {
    return { ok: false, reason: "no_address" };
  }

  const query = buildQuery(property.address, property.partido);
  const result = await geocodeAddress(query);
  if (!result) {
    return { ok: false, reason: "not_found" };
  }

  const { error: updateError } = await supabase
    .from("properties")
    .update({ lat: result.lat, lng: result.lng } as never)
    .eq("id", propertyId);
  if (updateError) throw updateError;

  return {
    ok: true,
    lat: result.lat,
    lng: result.lng,
    source: result.source,
    displayName: result.displayName,
  };
}
