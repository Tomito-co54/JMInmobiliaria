import { ownerPropertyDraftSchema } from "@/lib/validators/property";
import { ACCEPTED_PHOTO_MIMES } from "@/lib/storage/property-photos";

/**
 * Pure helpers behind `scripts/create-property.ts` — the CLI that loads an
 * owner property from a JSON file instead of the admin form.
 *
 * The CLI itself is I/O: Supabase, ARBA, Storage. Everything decidable
 * without a network lives here so it can be tested, because this is the
 * layer that decides what ends up in the catalog.
 */

/** A photo to attach, either a path on disk or an http(s) URL. */
export type PhotoRef = string;

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/**
 * Mime type for a photo reference, from its extension.
 *
 * Extension rather than sniffing the bytes because the bucket's own policy
 * (migration 00012) is declared in mime types, and a file whose extension
 * lies would be rejected there anyway — better to say so before uploading
 * eight megabytes.
 */
export function mimeForPhoto(ref: PhotoRef): string | null {
  const withoutQuery = ref.split("?")[0];
  const ext = withoutQuery.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  const mime = EXT_TO_MIME[ext];
  if (!mime) return null;
  return ACCEPTED_PHOTO_MIMES.includes(
    mime as (typeof ACCEPTED_PHOTO_MIMES)[number],
  )
    ? mime
    : null;
}

export function isRemotePhoto(ref: PhotoRef): boolean {
  return /^https?:\/\//i.test(ref);
}

/**
 * Fields the JSON may carry that are not part of the draft schema.
 *
 * `nomenclatura_catastral` is here and not in the schema for the same
 * reason `partida` is: the form never writes it directly, ARBA does. The
 * file may name it because a unit under propiedad horizontal has a partida
 * the public layer cannot resolve, and the lot's nomenclature — which the
 * papers carry — is the key that can.
 */
const EXTRA_KEYS = ["partida", "nomenclatura_catastral", "photos", "is_featured"] as const;

export interface ImportPayload {
  /** Column values, already coerced by the draft schema. */
  row: Record<string, unknown>;
  partida: string | null;
  /** The lot's cadastral nomenclature, when the file gives it (PH units). */
  nomenclatura: string | null;
  photos: PhotoRef[];
  isFeatured: boolean;
}

export interface ImportParse {
  ok: boolean;
  payload?: ImportPayload;
  errors: string[];
  warnings: string[];
}

/**
 * Turns the raw JSON into something the loader can write.
 *
 * Deliberately strict about unknown keys. A typo'd `"precio"` instead of
 * `"price_amount"` would otherwise be dropped in silence and the property
 * would land in the catalog priced at nothing — the kind of failure that
 * looks like a successful run.
 */
export function parseImportPayload(raw: unknown): ImportParse {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: ["El archivo tiene que ser un objeto JSON."], warnings };
  }

  const input = raw as Record<string, unknown>;

  const known = new Set<string>([
    ...Object.keys(ownerPropertyDraftSchema.shape),
    ...EXTRA_KEYS,
  ]);
  for (const key of Object.keys(input)) {
    if (!known.has(key)) {
      errors.push(
        `Campo desconocido: "${key}". Los válidos son: ${[...known].sort().join(", ")}.`,
      );
    }
  }

  const parsed = ownerPropertyDraftSchema.safeParse(input);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`${issue.path.join(".") || "(raíz)"}: ${issue.message}`);
    }
  }

  // The draft schema coerces anything unparseable to null, on purpose: the
  // form saves half-filled properties all the time and an empty box is not
  // an error. A file is different. `"price_amount": "ochenta mil"` is a
  // stated value, and turning it into "no price" would be the same silent
  // failure as swallowing a misspelled key — the run reports success and
  // the listing is wrong.
  if (parsed.success) {
    const out = parsed.data as Record<string, unknown>;
    for (const [key, value] of Object.entries(input)) {
      if (EXTRA_KEYS.includes(key as (typeof EXTRA_KEYS)[number])) continue;
      const given = value !== null && value !== undefined && value !== "";
      if (given && out[key] === null) {
        errors.push(
          `${key}: no pude interpretar ${JSON.stringify(value)}. ` +
            `Si querés dejarlo vacío, omitilo o poné null.`,
        );
      }
    }
  }

  const photosRaw = input.photos ?? [];
  const photos: PhotoRef[] = [];
  if (!Array.isArray(photosRaw)) {
    errors.push('"photos" tiene que ser una lista de rutas o URLs.');
  } else {
    for (const p of photosRaw) {
      if (typeof p !== "string" || p.trim() === "") {
        errors.push(`Foto inválida: ${JSON.stringify(p)}`);
        continue;
      }
      if (mimeForPhoto(p) === null) {
        errors.push(`Foto con extensión no aceptada (jpg, png, webp): ${p}`);
        continue;
      }
      photos.push(p.trim());
    }
  }
  if (photos.length === 0) {
    warnings.push("Sin fotos: la propiedad no se va a poder publicar.");
  }

  const partidaRaw = input.partida;
  let partida: string | null = null;
  if (partidaRaw !== undefined && partidaRaw !== null && partidaRaw !== "") {
    if (typeof partidaRaw !== "string") {
      errors.push('"partida" tiene que ser texto.');
    } else {
      partida = partidaRaw.trim();
    }
  } else {
    warnings.push("Sin partida: no se consulta ARBA y no se va a poder publicar.");
  }

  const nomenclaturaRaw = input.nomenclatura_catastral;
  let nomenclatura: string | null = null;
  if (nomenclaturaRaw !== undefined && nomenclaturaRaw !== null && nomenclaturaRaw !== "") {
    if (typeof nomenclaturaRaw !== "string") {
      errors.push('"nomenclatura_catastral" tiene que ser texto.');
    } else {
      nomenclatura = nomenclaturaRaw.trim();
    }
  }

  const isFeatured = input.is_featured === true;

  if (errors.length > 0) return { ok: false, errors, warnings };

  return {
    ok: true,
    errors,
    warnings,
    payload: {
      row: parsed.success ? (parsed.data as Record<string, unknown>) : {},
      partida,
      nomenclatura,
      photos,
      isFeatured,
    },
  };
}
