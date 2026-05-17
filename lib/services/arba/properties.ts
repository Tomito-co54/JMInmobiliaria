import { getAdminClient } from "./client";
import { lookupParcel } from "./index";

/**
 * Bridges lookupParcel() and the properties table: reads lat/lng, looks up
 * the parcel via ARBA's WFS (or cache), and writes partida + nomenclatura +
 * surface_arba back to the property row.
 *
 * Idempotent — already-enriched properties short-circuit at the top.
 */

export type EnsureCadastralResult =
  | {
      ok: true;
      /** Null when ARBA's parcela has no fiscal ID attached (rare). */
      partida: string | null;
      nomenclatura: string;
      surfaceArba: number | null;
      tipo: string | null;
      matchStrategy: "intersects" | "dwithin" | "existing";
      distanceMeters: number;
      source: "existing" | "cache" | "arba";
    }
  | {
      ok: false;
      reason: "no_coords" | "not_found";
    };

interface PropertyRow {
  id: string;
  lat: number | null;
  lng: number | null;
  partida: string | null;
  nomenclatura_catastral: string | null;
  surface_arba: number | null;
}

export async function ensurePropertyCadastral(
  propertyId: string,
): Promise<EnsureCadastralResult> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from("properties")
    .select("id, lat, lng, partida, nomenclatura_catastral, surface_arba")
    .eq("id", propertyId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error(`Property not found: ${propertyId}`);

  const property = data as unknown as PropertyRow;

  // Already enriched when nomenclatura is set — partida may be null for
  // unassigned parcels, that's still a valid "done" state.
  if (property.nomenclatura_catastral) {
    return {
      ok: true,
      partida: property.partida,
      nomenclatura: property.nomenclatura_catastral,
      surfaceArba: property.surface_arba,
      tipo: null,
      matchStrategy: "existing",
      distanceMeters: 0,
      source: "existing",
    };
  }

  if (property.lat === null || property.lng === null) {
    return { ok: false, reason: "no_coords" };
  }

  const result = await lookupParcel(property.lat, property.lng);
  if (!result) {
    return { ok: false, reason: "not_found" };
  }

  const { error: updateError } = await supabase
    .from("properties")
    .update({
      partida: result.partida,
      nomenclatura_catastral: result.nomenclatura,
      surface_arba: result.surfaceM2,
    } as never)
    .eq("id", propertyId);
  if (updateError) throw updateError;

  return {
    ok: true,
    partida: result.partida,
    nomenclatura: result.nomenclatura,
    surfaceArba: result.surfaceM2,
    tipo: result.tipo,
    matchStrategy: result.matchStrategy,
    distanceMeters: result.distanceMeters,
    source: result.source,
  };
}
