import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isRemotePhoto, mimeForPhoto, type ImportPayload } from "@/lib/admin/property-import";
import { validateNomenclatura, validatePartida } from "@/lib/zona-sur/partidos";
import {
  ensurePropertyCadastralByNomenclatura,
  ensurePropertyCadastralByPartida,
} from "@/lib/services/arba/properties";
import { deleteAllPhotosForProperty, uploadPropertyPhoto } from "@/lib/storage/property-photos";
import { canPublishProperty } from "@/lib/validators/property";
import { ComparablesCache, recomputeQualityScore } from "@/lib/scoring";

/**
 * Writes one owner property from a parsed import payload — the steps behind
 * `npm run cargar-propiedad` and `npm run sincronizar-cartera`, so the two
 * CLIs share one implementation instead of drifting.
 *
 * Two modes:
 *   - create: insert as `owner_direct` + `borrador`, then ARBA, photos, score.
 *   - update (`existingId`): patch the row the folder already loaded once.
 *     Running a sync twice must not duplicate a listing (PUBLICACION.md rule
 *     4), and it must not surprise either: a price change and a gallery
 *     replacement are opt-in flags, because both are visible to every
 *     visitor the moment they land, and the maestra's prices are known to
 *     lag (2023 figures still in the sheet on 16-sep-2026).
 *
 * Publishing goes through `canPublishProperty` in both modes: a half-loaded
 * property cannot reach the catalog by way of a script when it couldn't
 * through the form.
 */

export type TargetStatus = "publicada" | "borrador" | "vendida";

export interface LoadOptions {
  /** Update this row instead of inserting. */
  existingId?: string | null;
  /** Where the row should end up. `null` = leave as is. */
  status: TargetStatus | null;
  /** Update mode only: overwrite `price_amount` / `price_currency`. */
  updatePrice: boolean;
  /** Update mode only: delete the stored gallery and upload the folder's. */
  replacePhotos: boolean;
  /**
   * Update mode only: the keys the source actually stated. The draft schema
   * fills every missing field with null, so patching the whole row would
   * erase the description, the year, the bedrooms of a listing whose ficha
   * simply does not mention them yet. Same rule as the editor's section
   * saves: additive, never a stomp. Omitted = every key (create mode).
   */
  statedKeys?: readonly string[];
  log: (line: string) => void;
}

export interface LoadResult {
  id: string;
  created: boolean;
  status: string | null;
}

async function photoToFile(ref: string): Promise<File> {
  const mime = mimeForPhoto(ref)!;
  if (isRemotePhoto(ref)) {
    const res = await fetch(ref);
    if (!res.ok) throw new Error(`HTTP ${res.status} al bajar ${ref}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return new File([buf], basename(new URL(ref).pathname), { type: mime });
  }
  const path = resolve(ref);
  const buf = await readFile(path);
  return new File([buf], basename(path), { type: mime });
}

/** The owner row already keyed by this address, if any. */
export async function findOwnerPropertyByAddress(
  sb: SupabaseClient,
  address: string,
): Promise<{ id: string; listing_status: string | null }[]> {
  const { data, error } = await sb
    .from("properties")
    .select("id, listing_status")
    .in("source", ["owner_direct", "agency"])
    .eq("address", address);
  if (error) throw new Error(`No pude buscar "${address}": ${error.message}`);
  return (data ?? []) as { id: string; listing_status: string | null }[];
}

/**
 * Validates partida / nomenclatura against the partido prefix. Throws on a
 * mismatch: one of the two is wrong and it is cheaper to say so before
 * writing. Returns the normalized forms ARBA is queried with.
 */
export function normalizeCadastral(payload: ImportPayload): {
  partida: string | null;
  nomenclatura: string | null;
} {
  const { row, partida, nomenclatura } = payload;
  let partidaNormalized: string | null = null;
  if (partida && row.partido) {
    const v = validatePartida(row.partido as string, partida);
    if (!v.ok) throw new Error(v.message);
    partidaNormalized = v.normalized;
  } else if (partida) {
    throw new Error("Hay partida pero falta el partido: sin él no se puede validar el prefijo.");
  }
  let nomenclaturaNormalized: string | null = null;
  if (nomenclatura && row.partido) {
    const v = validateNomenclatura(row.partido as string, nomenclatura);
    if (!v.ok) throw new Error(v.message);
    nomenclaturaNormalized = v.normalized;
  } else if (nomenclatura) {
    throw new Error("Hay nomenclatura pero falta el partido: sin él no se puede validar el prefijo.");
  }
  return { partida: partidaNormalized, nomenclatura: nomenclaturaNormalized };
}

export async function loadProperty(
  sb: SupabaseClient,
  payload: ImportPayload,
  opts: LoadOptions,
): Promise<LoadResult> {
  const { row, partida, photos, isFeatured } = payload;
  const { log } = opts;
  const cad = normalizeCadastral(payload);

  let id: string;
  let created = false;

  if (opts.existingId) {
    id = opts.existingId;
    // Only what the ficha states, and never the two visible-at-once fields
    // without their flag. `is_featured` is the ★ in /admin, not the folder's.
    const stated = opts.statedKeys ? new Set(opts.statedKeys) : null;
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      if (!stated || stated.has(k)) patch[k] = v;
    }
    delete patch.price_amount;
    delete patch.price_currency;
    if (opts.updatePrice && (!stated || stated.has("price_amount"))) {
      patch.price_amount = row.price_amount;
      patch.price_currency = row.price_currency;
    }
    if (partida) patch.partida = partida;
    const { error } = await sb.from("properties").update(patch as never).eq("id", id);
    if (error) throw new Error(`No pude actualizar la propiedad: ${error.message}`);
    log(`✓ Actualizada: ${id}${opts.updatePrice ? " (precio incluido)" : " (precio sin tocar)"}`);
  } else {
    const { data, error } = await sb
      .from("properties")
      .insert({
        ...row,
        partida,
        source: "owner_direct",
        listing_status: "borrador",
        is_active: true,
        is_featured: isFeatured,
      } as never)
      .select("id")
      .single();
    if (error) throw new Error(`No pude crear la propiedad: ${error.message}`);
    id = (data as { id: string }).id;
    created = true;
    log(`✓ Borrador creado: ${id}`);
  }

  // ARBA is explicitly non-fatal. The provincial service goes down, and a
  // listing shouldn't be lost because of it — same call the form's
  // "Consultar ARBA" button makes, same tolerance. Both lookups short-circuit
  // on an already-enriched row, so re-running a sync costs nothing here.
  if (cad.nomenclatura || cad.partida) {
    try {
      const r = cad.nomenclatura
        ? await ensurePropertyCadastralByNomenclatura(id, cad.nomenclatura)
        : await ensurePropertyCadastralByPartida(id, cad.partida!);
      if (r.ok) log(`✓ ARBA: ${r.nomenclatura} · ${r.surfaceArba ?? "?"} m² · ${r.tipo ?? "?"}`);
      else log(`  ⚠ ARBA no respondió con la parcela (${r.reason}). Queda sin verificar.`);
    } catch (err) {
      log(`  ⚠ ARBA falló: ${err instanceof Error ? err.message : err}`);
    }
  }

  if (created || opts.replacePhotos) {
    if (!created) {
      const del = await deleteAllPhotosForProperty(id);
      if (!del.ok) throw new Error(`No pude borrar la galería anterior: ${del.error}`);
      log(`✓ Galería anterior borrada (${del.deleted} fotos)`);
    }
    const uploaded: string[] = [];
    for (const [i, ref] of photos.entries()) {
      try {
        const f = await photoToFile(ref);
        const r = await uploadPropertyPhoto(id, f);
        if (r.ok && r.url) {
          uploaded.push(r.url);
          log(`✓ Foto ${i + 1}/${photos.length}: ${basename(ref)}`);
        } else {
          log(`  ⚠ Foto ${i + 1} falló: ${r.error}`);
        }
      } catch (err) {
        log(`  ⚠ Foto ${i + 1} falló: ${err instanceof Error ? err.message : err}`);
      }
    }
    if (uploaded.length > 0 || opts.replacePhotos) {
      const { error } = await sb.from("properties").update({ photos: uploaded } as never).eq("id", id);
      if (error) log(`  ⚠ No pude guardar las fotos: ${error.message}`);
    }
  }

  try {
    // warmUp() is not optional: the cache throws on `get` until it has
    // loaded the comparables, and the price sub-score is most of what
    // separates a scored listing from one the ring shows as "sin datos".
    const comparables = new ComparablesCache();
    await comparables.warmUp();
    const breakdown = await recomputeQualityScore(id, comparables);
    log(`✓ Quality score: ${breakdown?.score ?? "sin datos suficientes"}`);
  } catch (err) {
    log(`  ⚠ Score falló: ${err instanceof Error ? err.message : err}`);
  }

  let status: string | null = null;
  if (opts.status) {
    const { data: fresh } = await sb
      .from("properties")
      .select(
        "listing_status, property_type, operation_type, price_amount, price_currency, partido, partida, nomenclatura_catastral, address, photos",
      )
      .eq("id", id)
      .single();
    const current = (fresh as { listing_status: string | null } | null)?.listing_status ?? null;
    if (current === opts.status) {
      status = current;
    } else if (opts.status === "publicada") {
      const check = canPublishProperty(fresh as never);
      if (!check.ok) {
        log(`  ⚠ No se publica, falta: ${check.missing.join(", ")}. Queda en ${current ?? "borrador"}.`);
        status = current;
      } else {
        const { error } = await sb.from("properties").update({ listing_status: "publicada" } as never).eq("id", id);
        if (error) log(`  ⚠ No pude publicar: ${error.message}`);
        else {
          log("✓ Publicada");
          status = "publicada";
        }
      }
    } else {
      const { error } = await sb.from("properties").update({ listing_status: opts.status } as never).eq("id", id);
      if (error) log(`  ⚠ No pude cambiar el estado: ${error.message}`);
      else {
        log(`✓ Estado: ${current ?? "?"} → ${opts.status}`);
        status = opts.status;
      }
    }
  }

  return { id, created, status };
}
