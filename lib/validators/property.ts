import { z } from "zod";
import { PARTIDOS_ZONA_SUR } from "@/lib/zona-sur/partidos";

/**
 * Zod schemas for the admin property loader.
 *
 * Two flavors of validation:
 *
 *   ownerPropertyDraftSchema   — what we accept when saving a draft. Almost
 *                                everything is optional; the broker can save
 *                                a half-loaded property and come back later.
 *
 *   ownerPropertyPublishSchema — what we require to flip listing_status to
 *                                'publicada'. The catalog can't show a row
 *                                missing price, type, address, etc.
 *
 * Field names match the `properties` column names directly (snake_case for
 * the form data, since these schemas validate FormData and DB writes alike).
 *
 * Implementation note: we use `z.preprocess()` for coercion rather than
 * `.transform()` so the schemas compose cleanly via `.extend()` for the
 * publish flavor — Zod 4's interactions between transform + default +
 * union turned out to be brittle in this combination.
 */

const PROPERTY_TYPES = ["casa", "departamento", "ph", "lote", "local"] as const;
const OPERATION_TYPES = ["venta", "alquiler"] as const;
const CURRENCIES = ["USD", "ARS"] as const;
const LISTING_STATUSES = ["borrador", "publicada", "vendida"] as const;

/** Coerce `""`, `null`, `undefined` to `null`; trim strings. */
function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Coerce empty/null/undefined to `null`; otherwise parse as positive number. */
function toNullablePositiveNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n =
    typeof value === "string" ? parseFloat(value.replace(",", ".")) : Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Same as above but for positive integers. */
function toNullablePositiveInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n =
    typeof value === "string" ? parseInt(value, 10) : Math.floor(Number(value));
  return Number.isFinite(n) && n > 0 ? n : null;
}

const nullableString = (max?: number) =>
  z.preprocess(toNullableString, max !== undefined
    ? z.string().max(max).nullable()
    : z.string().nullable());

const nullablePositiveNumber = () =>
  z.preprocess(toNullablePositiveNumber, z.number().positive().nullable());

const nullablePositiveInt = () =>
  z.preprocess(toNullablePositiveInt, z.number().int().positive().nullable());

/**
 * Loose schema for draft saves. Everything optional; the only validations
 * are FORMAT (a number must be a number, an enum must be a known value).
 * Missing fields default to null so the row can be persisted as-is.
 *
 * For enums that have a sensible default (operation_type, price_currency),
 * we preprocess empty/null/undefined to the default value.
 */
export const ownerPropertyDraftSchema = z.object({
  property_type: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z.enum(PROPERTY_TYPES).nullable(),
  ),
  operation_type: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? "venta" : v),
    z.enum(OPERATION_TYPES),
  ),
  price_amount: nullablePositiveNumber(),
  price_currency: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? "USD" : v),
    z.enum(CURRENCIES),
  ),
  description: nullableString(5000),

  surface_total: nullablePositiveNumber(),
  surface_covered: nullablePositiveNumber(),
  rooms: nullablePositiveInt(),
  bedrooms: nullablePositiveInt(),
  bathrooms: nullablePositiveInt(),
  garages: nullablePositiveInt(),

  partido: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z
      .string()
      .nullable()
      .refine(
        (v) => v === null || PARTIDOS_ZONA_SUR.includes(v),
        "Partido fuera del mapa de Zona Sur.",
      ),
  ),
  address: nullableString(250),
});

export type OwnerPropertyDraft = z.infer<typeof ownerPropertyDraftSchema>;

/**
 * Strict schema: what we require to set listing_status='publicada'.
 * Same shape as draft but with fields tightened (no nulls).
 */
export const ownerPropertyPublishSchema = ownerPropertyDraftSchema.extend({
  property_type: z.enum(PROPERTY_TYPES),
  operation_type: z.enum(OPERATION_TYPES),
  price_amount: z.preprocess(
    toNullablePositiveNumber,
    z.number().positive(),
  ),
  price_currency: z.enum(CURRENCIES),
  partido: z.enum(
    PARTIDOS_ZONA_SUR as unknown as readonly [string, ...string[]],
  ),
  address: z.preprocess(
    toNullableString,
    z.string().min(1, "La dirección es obligatoria"),
  ),
});

export type OwnerPropertyPublish = z.infer<typeof ownerPropertyPublishSchema>;

export const listingStatusSchema = z.enum(LISTING_STATUSES);
export type ListingStatus = z.infer<typeof listingStatusSchema>;

/** In-DB row shape relevant to publish-readiness. */
export interface PublishCheckInput {
  property_type: string | null;
  operation_type: string | null;
  price_amount: number | null;
  price_currency: string | null;
  partido: string | null;
  partida: string | null;
  nomenclatura_catastral: string | null;
  address: string | null;
  photos: unknown;
}

export interface PublishCheckResult {
  ok: boolean;
  /** Human-readable reasons why publish is blocked. */
  missing: string[];
}

/**
 * Pure predicate: given a property row's current state, can we flip it to
 * 'publicada'? Lists every missing field so the UI can disable the button
 * and tooltip what's missing.
 */
export function canPublishProperty(p: PublishCheckInput): PublishCheckResult {
  const missing: string[] = [];

  if (!p.property_type) missing.push("tipo");
  if (!p.operation_type) missing.push("operación");
  if (p.price_amount === null || p.price_amount <= 0) missing.push("precio");
  if (!p.price_currency) missing.push("moneda");
  if (!p.partido) missing.push("partido");
  if (!p.partida) missing.push("partida");
  if (!p.nomenclatura_catastral) missing.push("datos de ARBA");
  if (!p.address || p.address.trim().length === 0) missing.push("dirección");

  const photos = Array.isArray(p.photos) ? p.photos : [];
  if (photos.length === 0) missing.push("al menos una foto");

  return { ok: missing.length === 0, missing };
}
