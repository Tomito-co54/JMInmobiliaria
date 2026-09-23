/**
 * subir-portada — the cover photo of a building, when it is not in any unit's
 * gallery (a street-level shot of the façade, usually).
 *
 *   npm run subir-portada -- "<archivo .jpg>" <nomenclatura de la parcela>
 *
 * Uploads to `property-photos/edificios/<parcela>.jpg`. That folder is the
 * building covers' own: the maestra sync replaces unit galleries (deleting
 * and re-uploading under new names) and never touches it, so the URL is
 * stable. Then add the parcel to BY_PARCEL in lib/buildings/photos.ts as
 * `{ file: "edificios/<parcela>.jpg" }`.
 *
 * The source of the file stays in the building's `Publicación/_edificio/`
 * folder, per PUBLICACION.md.
 */
import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local", quiet: true });

const [file, parcel] = process.argv.slice(2);
if (!file || !parcel || !/^\d{3}\w{39}$/.test(parcel)) {
  console.error('Uso: npm run subir-portada -- "<archivo .jpg>" <nomenclatura de 42 caracteres>');
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });
const dest = `edificios/${parcel}.jpg`;
sb.storage
  .from("property-photos")
  .upload(dest, readFileSync(file), { contentType: "image/jpeg", upsert: true })
  .then(({ error }) => {
    if (error) {
      console.error(`✗ ${error.message}`);
      process.exit(1);
    }
    console.log(`✓ ${sb.storage.from("property-photos").getPublicUrl(dest).data.publicUrl}`);
    console.log(`  En lib/buildings/photos.ts: "${parcel}": { file: "${dest}" },`);
  });
