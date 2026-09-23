/**
 * A photo that shows the BUILDING, per parcel.
 *
 * The rest of `lib/buildings` is derived with no table behind it, and this
 * stays in that spirit while admitting what cannot be derived: which of a
 * building's photos is a photo of the building.
 *
 * The obvious guess — the cover of its first unit — is wrong in practice. At
 * Belgrano 1287 that is a kitchen counter, because the cover of a listing is
 * chosen to sell the unit, not to identify the block it sits in. Nothing in
 * the data distinguishes a façade from a living room. So the choice is made
 * here, by a person who looked at the picture.
 *
 * It is written as "photo N of unit X", the way Tomy and Cowork name it ("la
 * 09 de la UF 2"), and resolved against that unit's CURRENT gallery. It used
 * to be a fixed Storage URL, and that broke: the maestra sync with --fotos
 * deletes a gallery and uploads it again under new names, so the Belgrano
 * cover pointed at a file that no longer existed and the page showed its alt
 * text (Tomy, 23-sep-2026). The number is the file's number in
 * `Publicación/<Unidad>/fotos/` (09-UF2.jpg → 9), which is also its position
 * in the gallery, and it survives a re-upload.
 *
 * This is a stopgap with a known successor: the module doc in ./index.ts
 * already describes the `buildings` table that arrives when a building earns
 * an identity of its own. When it does, this map is what it replaces.
 */

/**
 * Either a photo in a unit's gallery, or a cover of the building's own —
 * a façade from the street that belongs to no unit — uploaded once with
 * `npm run subir-portada` to `edificios/`, a folder the sync never touches.
 */
type CoverRef =
  | {
      /** The unit whose gallery holds the photo, by its address on the site. */
      unit: string;
      /** 1-based, as numbered in the unit's folder. */
      photo: number;
    }
  | {
      /** Path inside the property-photos bucket. */
      file: string;
    };

const BUCKET =
  "https://cjnaxxidigdylnwlpyab.supabase.co/storage/v1/object/public/property-photos";

const BY_PARCEL: Record<string, CoverRef> = {
  // RUMAH — Belgrano 1287, Banfield. The common courtyard: the stair, the
  // balconies, the ground-floor door (18-1A.jpg).
  "063030B00000000000000000000000150000027000": { unit: "Belgrano 1287 1°A", photo: 18 },
  // Cabrera 205, Banfield. The corner from across the street, from the
  // photos of its Trezza listing (09-UF2.jpg), picked by Tomy on 23-sep.
  "063030A0000000000000000000000045000002600A": { unit: "Cabrera 205 UF 2", photo: 9 },
  // Portela 95, Lomas de Zamora. The whole façade from the opposite
  // sidewalk, picked by Tomy on 23-sep; source in the building's
  // Publicación/_edificio/.
  "063020B00000000000000000000000080000011000": {
    file: "edificios/063020B00000000000000000000000080000011000.jpg",
  },
};

/**
 * The registered photo for a building, looked up in the gallery of the unit
 * that holds it, or null to fall back to whatever the caller uses when a
 * building has no picture of itself — including when that unit is not
 * published or its gallery is shorter than the number (never a broken image).
 */
export function buildingPhoto(
  parcel: string | null | undefined,
  units: readonly { address: string | null; photos?: string[] | null }[],
): string | null {
  if (!parcel) return null;
  const ref = BY_PARCEL[parcel.trim()];
  if (!ref) return null;
  if ("file" in ref) return `${BUCKET}/${ref.file}`;
  const unit = units.find((u) => u.address === ref.unit);
  return unit?.photos?.[ref.photo - 1] ?? null;
}
