import { getAdminClient } from "./client";
import { lookupParcel } from "./index";
import { getParcelByPartida } from "./wfs";

/**
 * Two bridges between ARBA's WFS and the `properties` table:
 *
 *   ensurePropertyCadastral(id)
 *     → geographic lookup. Reads property.lat/lng, queries by point
 *       intersection / proximity, persists partida + nomenclatura +
 *       surface_arba + tpa. Used by the scraping pipeline.
 *
 *   ensurePropertyCadastralByPartida(id, partida)
 *     → direct attribute lookup. Used by the admin loader where the owner
 *       enters the partida from paper records. No geocoding involved.
 *
 * Both are idempotent — already-enriched properties short-circuit at the top.
 */

export type EnsureCadastralResult =
  | {
      ok: true;
      /** Null when ARBA's parcela has no fiscal ID attached (rare). */
      partida: string | null;
      nomenclatura: string;
      surfaceArba: number | null;
      tipo: string | null;
      matchStrategy: "intersects" | "dwithin" | "by_partida" | "existing";
      distanceMeters: number;
      source: "existing" | "cache" | "arba";
    }
  | {
      ok: false;
      reason: "no_coords" | "not_found" | "partida_not_found";
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
      tpa: result.tipo,
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

/**
 * Looks up a property's cadastral data by exact partida (tax ID), writes
 * back partida + nomenclatura + surface_arba + tpa.
 *
 * Idempotent: if `nomenclatura_catastral` is already set on the row, we
 * skip the network call entirely and return what's in the DB.
 *
 * Non-cached: each call hits ARBA. By-partida lookups are rare (manual
 * loader, one property at a time) so caching adds complexity without
 * meaningful payoff. The geographic `lookupParcel` keeps its lat/lng cache.
 */
export async function ensurePropertyCadastralByPartida(
  propertyId: string,
  partida: string,
): Promise<EnsureCadastralResult> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from("properties")
    .select("id, partida, nomenclatura_catastral, surface_arba, tpa")
    .eq("id", propertyId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error(`Property not found: ${propertyId}`);

  const property = data as unknown as {
    id: string;
    partida: string | null;
    nomenclatura_catastral: string | null;
    surface_arba: number | null;
    tpa: string | null;
  };

  // Already enriched — short-circuit. Idempotent re-call after the first
  // successful lookup is a no-op.
  if (property.nomenclatura_catastral) {
    return {
      ok: true,
      partida: property.partida,
      nomenclatura: property.nomenclatura_catastral,
      surfaceArba: property.surface_arba,
      tipo: property.tpa,
      matchStrategy: "existing",
      distanceMeters: 0,
      source: "existing",
    };
  }

  const parcel = await getParcelByPartida(partida);
  if (!parcel) {
    return { ok: false, reason: "partida_not_found" };
  }

  const { error: updateError } = await supabase
    .from("properties")
    .update({
      partida: parcel.partida,
      nomenclatura_catastral: parcel.nomenclatura,
      surface_arba: parcel.surfaceM2,
      tpa: parcel.tipo,
    } as never)
    .eq("id", propertyId);
  if (updateError) throw updateError;

  return {
    ok: true,
    partida: parcel.partida,
    nomenclatura: parcel.nomenclatura,
    surfaceArba: parcel.surfaceM2,
    tipo: parcel.tipo,
    matchStrategy: "by_partida",
    distanceMeters: 0,
    source: "arba",
  };
}
