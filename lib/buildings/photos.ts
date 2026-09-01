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
 * the data distinguishes a façade from a living room, and picking "the last
 * photo" would encode the order one upload happened to use.
 *
 * So the choice is made once, here, by a person who looked at the picture.
 * The URL points at the same `property-photos` bucket as everything else —
 * this is not a second copy of the image, it is a second reference to one the
 * building already had.
 *
 * This is a stopgap with a known successor: the module doc in ./index.ts
 * already describes the `buildings` table that arrives when a building earns
 * an identity of its own (a name, common-area photos, amenities). When it
 * does, this map is what it replaces, and `buildingPhoto` is the only caller
 * that has to learn about it.
 */

const BUCKET =
  "https://cjnaxxidigdylnwlpyab.supabase.co/storage/v1/object/public/property-photos";

const BY_PARCEL: Record<string, string> = {
  // RUMAH — Belgrano 1287, Banfield. The common courtyard: the stair, the
  // balconies of all four units, the ground-floor door. Uploaded with unit
  // 1°A, which is why it is addressed through that unit's folder.
  "063030B00000000000000000000000150000027000": `${BUCKET}/70809970-2ed3-431e-90ee-657d0d064e6c/9bc6b6e8-bb3a-46ad-ba43-4131d6a1e5df.jpg`,
};

/**
 * The registered photo for a building, or null to fall back to whatever the
 * caller uses when a building has no picture of itself.
 */
export function buildingPhoto(parcel: string | null | undefined): string | null {
  if (!parcel) return null;
  return BY_PARCEL[parcel.trim()] ?? null;
}
