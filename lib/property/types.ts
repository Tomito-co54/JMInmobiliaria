/**
 * The property types, and what each one is called on screen.
 *
 * Mirrors the Postgres enum `property_type` (00001, plus `cochera` in
 * 00019). This list used to live as a copy in eleven files, each with its own
 * TYPE_LABELS; adding a type meant finding them all, and the ones nobody
 * found printed the raw enum value. Public surfaces and the loader read from
 * here now.
 *
 * `cochera` is a parking unit sold or rented on its own — a "U.C" in the
 * broker's portfolio — not the garage that comes with an apartment. That one
 * is an extra (lib/property/extras.ts).
 */

export const PROPERTY_TYPES = ["casa", "departamento", "ph", "lote", "local", "cochera"] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

const LABELS: Record<PropertyType, string> = {
  casa: "Casa",
  departamento: "Departamento",
  ph: "PH",
  lote: "Lote",
  local: "Local",
  cochera: "Cochera",
};

export function isPropertyType(value: unknown): value is PropertyType {
  return typeof value === "string" && (PROPERTY_TYPES as readonly string[]).includes(value);
}

/**
 * The label for a type, or the raw value for one this list does not know —
 * a scraped row can carry anything the source did, and a wrong word beats a
 * blank.
 */
export function propertyTypeLabel(type: string | null | undefined): string | null {
  if (!type) return null;
  return isPropertyType(type) ? LABELS[type] : type;
}

/** `{ value, label }` pairs for a <select>. */
export const PROPERTY_TYPE_OPTIONS = PROPERTY_TYPES.map((value) => ({ value, label: LABELS[value] }));
