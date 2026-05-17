/**
 * Address normalization for fuzzy deduplication.
 *
 * Argentine addresses have many surface variations of the same physical place:
 *   "Av. Hipólito Yrigoyen 9200" / "Avenida Hipolito Yrigoyen al 9200"
 *   "Juan de Garay 3500" / "J. de Garay 3500"
 *
 * We normalize down to a signature like "hipolito yrigoyen|9200" so two
 * listings of the same property collapse to the same key.
 */

/** Strip diacritics: "Hipólito" -> "Hipolito". */
function removeDiacritics(s: string): string {
  // ̀-ͯ = combining diacritical marks (added by NFD decomposition)
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Common abbreviations -> canonical form (already lowercased + diacritic-free). */
const REPLACEMENTS: Array<[RegExp, string]> = [
  // Avenue prefixes
  [/\bav\.?\b/g, "avenida"],
  [/\bavda\.?\b/g, "avenida"],
  // Quita "al" cuando precede a un número ("Garay al 3500" -> "Garay 3500")
  [/\bal\b\s+(?=\d)/g, ""],
  // Saint, Doctor, etc.
  [/\bsto\.?\b/g, "santo"],
  [/\bsta\.?\b/g, "santa"],
  [/\bdr\.?\b/g, "doctor"],
  [/\bgral\.?\b/g, "general"],
  // Compresión de espacios y puntuación
  [/[,;.]/g, " "],
  [/\s+/g, " "],
];

/** Words too generic to be useful in a signature — drop them. */
const STOPWORDS = new Set([
  "calle",
  "pje",
  "pasaje",
  "boulevard",
  "bv",
  "los",
  "las",
  "el",
  "la",
  "de",
  "del",
]);

/** Find a street number in the address text (first run of 1-5 digits). */
function extractNumber(text: string): number | null {
  const m = text.match(/\b(\d{1,5})\b/);
  return m ? parseInt(m[1], 10) : null;
}

export interface NormalizedAddress {
  /** Street name in canonical form (lowercase, no accents, no stopwords) */
  street: string;
  /** Street number, or null if not parseable */
  number: number | null;
  /** Signature for fuzzy comparison: "{partidoSlug}|{street}|{number}" */
  signature: string;
}

/** Slugify a partido name: "Lomas de Zamora" -> "lomas-de-zamora". */
export function partidoSlug(partido: string): string {
  return removeDiacritics(partido.toLowerCase())
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Normalize an address into a comparable signature.
 * Returns null if the address is unparseable (e.g. no street number).
 */
export function normalizeAddress(
  addr: string | null | undefined,
  partido: string | null | undefined,
): NormalizedAddress | null {
  if (!addr || !partido) return null;

  let text = removeDiacritics(addr.toLowerCase().trim());
  for (const [re, rep] of REPLACEMENTS) {
    text = text.replace(re, rep);
  }

  const number = extractNumber(text);
  if (number === null) return null; // require a numeric component for safety

  // Strip the number from the text to isolate the street name
  const streetOnly = text.replace(new RegExp(`\\b${number}\\b`), " ").trim();

  const words = streetOnly
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w))
    // Drop the avenue marker — both "Hipolito Yrigoyen" and "Avenida Hipolito Yrigoyen"
    // refer to the same street; keeping "avenida" would split them.
    .filter((w) => w !== "avenida");

  if (words.length === 0) return null;

  const street = words.join(" ");
  const slug = partidoSlug(partido);
  const signature = `${slug}|${street}|${number}`;

  return { street, number, signature };
}
