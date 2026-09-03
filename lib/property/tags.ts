/**
 * The labels a broker can put on one of their own listings.
 *
 * "Apto comercial", "Oferta", "A estrenar" are not derived from the row —
 * the operation is, the age is — they are claims the broker chooses to make.
 * So they are a column of their own (`properties.tags`, migration 00017)
 * and this module is the one place that knows which ones exist and what
 * each one is called on screen.
 *
 * A closed list, on purpose, and the same list the database enforces with a
 * CHECK. Adding a tag means adding it here AND in a migration that redefines
 * that CHECK; the compiler and the constraint then both refuse anything
 * else. That is the trade: a typo cannot reach the catalog as a fourth chip
 * nobody meant to publish.
 *
 * Pure, no I/O.
 */

export const PROPERTY_TAGS = ["apto_comercial", "oferta", "a_estrenar"] as const;

export type PropertyTag = (typeof PROPERTY_TAGS)[number];

interface TagSpec {
  label: string;
  /**
   * `true` for the one tag that is about the *price* rather than the
   * property. On screen it gets the accent treatment; the others describe
   * what the place is and stay quiet. Two loud chips would cancel out.
   */
  emphasis: boolean;
}

const TAG_SPECS: Record<PropertyTag, TagSpec> = {
  apto_comercial: { label: "Apto comercial", emphasis: false },
  oferta: { label: "Oferta", emphasis: true },
  a_estrenar: { label: "A estrenar", emphasis: false },
};

export function isPropertyTag(value: unknown): value is PropertyTag {
  return typeof value === "string" && (PROPERTY_TAGS as readonly string[]).includes(value);
}

export function tagLabel(tag: PropertyTag): string {
  return TAG_SPECS[tag].label;
}

export function tagEmphasis(tag: PropertyTag): boolean {
  return TAG_SPECS[tag].emphasis;
}

/**
 * Puts a list of tags in canonical order and drops repeats.
 *
 * Canonical order so the chips read the same on every surface no matter
 * which order the broker clicked them in. Unknown values are KEPT, at the
 * end: this runs before validation, and silently dropping a value the file
 * or the form stated would be the same quiet failure the loader exists to
 * refuse — the schema is what says no, out loud.
 */
export function orderTags(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const known of PROPERTY_TAGS) {
    if (values.includes(known) && !seen.has(known)) {
      seen.add(known);
      out.push(known);
    }
  }
  for (const v of values) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

/**
 * Reads whatever came out of the database or a JSON file as a tag list.
 * Anything that is not a known tag is left out — this is the READ side, and
 * a row the CHECK already accepted cannot hold one, so the filter is a type
 * narrowing, not a policy.
 */
export function readTags(value: unknown): PropertyTag[] {
  if (!Array.isArray(value)) return [];
  return orderTags(value.filter(isPropertyTag)) as PropertyTag[];
}
