/**
 * Detect whether a property satisfies a must-have ("cochera", "patio", etc.).
 *
 * Strategy: try structured fields first (e.g. property.garages > 0 for
 * "cochera"), fall back to a regex search in the description. It's naive
 * but works for our current listings, which all have rich descriptions.
 * We'll upgrade to embeddings or NLP if/when false positives become a
 * problem.
 *
 * Pure function: no I/O.
 */

import type { PropertyForMatching } from "./types";

/**
 * Maps a must-have tag (as the user types it on the form) to a normalized
 * id that the detector switch knows about. Also acts as the allowlist for
 * the onboarding/edit forms.
 */
export const KNOWN_MUST_HAVES = [
  "cochera",
  "patio",
  "balcon",
  "parrilla",
  "pileta",
  "terraza",
  "jardin",
  "ascensor",
  "amenities",
  "seguridad",
] as const;

export type KnownMustHave = (typeof KNOWN_MUST_HAVES)[number];

/**
 * Canonicalize a tag the user typed: lowercase, strip accents, strip
 * non-alphanumeric. "Balcón " → "balcon".
 */
export function normalizeTag(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * Normalize free-form text (a property description) for substring/regex
 * matching. Lowercase + strip accents but preserve whitespace so word
 * boundaries still work.
 */
export function normalizeForMatching(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

type Detector = (property: PropertyForMatching, descNorm: string) => boolean;

/**
 * Word-boundary regexes against the description (which has been
 * accent-stripped + lowercased). We accept Spanish synonyms.
 */
const TAG_DETECTORS: Record<string, Detector> = {
  cochera: (p, d) => (p.garages !== null && p.garages > 0) || /\b(cochera|garage|garaje)\b/.test(d),
  patio: (_, d) => /\bpatio\b/.test(d),
  balcon: (_, d) => /\bbalcon(es)?\b/.test(d),
  parrilla: (_, d) => /\b(parrilla|asador|quincho)\b/.test(d),
  pileta: (_, d) => /\b(pileta|piscina)\b/.test(d),
  terraza: (_, d) => /\bterraza\b/.test(d),
  jardin: (_, d) => /\bjardin\b/.test(d),
  ascensor: (_, d) => /\bascensor\b/.test(d),
  amenities: (_, d) => /\b(amenities|amenidades|sum|gimnasio|laundry)\b/.test(d),
  seguridad: (_, d) => /\b(seguridad|vigilancia|porteria|portero|encargado)\b/.test(d),
};

export function propertySatisfiesMustHave(
  property: PropertyForMatching,
  tag: string,
): boolean {
  const id = normalizeTag(tag);
  const descNorm = normalizeForMatching(property.description ?? "");
  const detector = TAG_DETECTORS[id];
  if (detector) return detector(property, descNorm);
  // Unknown tag → fall back to substring match against the raw canonical id.
  // Won't catch "balcón" in description if the tag itself is exotic, but
  // we degrade gracefully rather than crashing.
  return descNorm.includes(id);
}

export function countMustHavesFulfilled(
  property: PropertyForMatching,
  mustHaves: string[],
): { fulfilled: string[]; missing: string[] } {
  const fulfilled: string[] = [];
  const missing: string[] = [];
  for (const tag of mustHaves) {
    if (propertySatisfiesMustHave(property, tag)) {
      fulfilled.push(tag);
    } else {
      missing.push(tag);
    }
  }
  return { fulfilled, missing };
}
