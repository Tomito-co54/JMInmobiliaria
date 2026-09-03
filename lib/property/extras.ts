/**
 * Extras on a listing — cochera, patio, terraza — and what each one means
 * for the price.
 *
 * A unit does not have one price, it has a short table: Belgrano 1287 1°A is
 * USD 80.000, or 88.000 with the garage; Alsina 1639 4°Y comes with garage
 * 00-15 and terrace 05-02 whether the buyer asks or not. `price_amount` stays
 * the floor — contado, sin extras — because the Quality Score, the comparables
 * and the market dashboard all read it and must keep reading the base number.
 * Everything above the floor lives here.
 *
 *   mode "incluida"  → fixed. Shown as a chip, never a control: there is
 *                      nothing to decide.
 *   mode "opcional"  → a toggle on the listing. `price_delta` is what it adds
 *                      to the price; null means "consultar".
 *
 * Closed lists for kind and mode, mirrored by the CHECK in migration 00020
 * (`property_extras_valid`), for the same reason tags are: a typo must not
 * become a fourth chip. One entry per kind — two garages are one "cochera"
 * whose detail names both.
 *
 * Pure, no I/O.
 */

export const EXTRA_KINDS = ["cochera", "patio", "terraza"] as const;
export type ExtraKind = (typeof EXTRA_KINDS)[number];

export const EXTRA_MODES = ["incluida", "opcional"] as const;
export type ExtraMode = (typeof EXTRA_MODES)[number];

export interface PropertyExtra {
  kind: ExtraKind;
  mode: ExtraMode;
  /** Short free text: "00-15", "40 m²", "cubierta". */
  detail: string | null;
  /** What an OPTIONAL extra adds to the price. Always null when included. */
  price_delta: number | null;
}

const KIND_LABELS: Record<ExtraKind, string> = {
  cochera: "Cochera",
  patio: "Patio",
  terraza: "Terraza",
};

export function isExtraKind(value: unknown): value is ExtraKind {
  return typeof value === "string" && (EXTRA_KINDS as readonly string[]).includes(value);
}

export function isExtraMode(value: unknown): value is ExtraMode {
  return typeof value === "string" && (EXTRA_MODES as readonly string[]).includes(value);
}

export function extraKindLabel(kind: ExtraKind): string {
  return KIND_LABELS[kind];
}

/** "Cochera 00-15", "Terraza 40 m²", or just "Patio" when there is no detail. */
export function extraTitle(extra: PropertyExtra): string {
  const label = extraKindLabel(extra.kind);
  return extra.detail ? `${label} ${extra.detail}` : label;
}

/**
 * Reads a database value (jsonb) defensively into typed extras, in canonical
 * kind order, one per kind. This is the READ side: a row the CHECK accepted
 * cannot hold anything else, so the filtering is a type narrowing.
 */
export function readExtras(value: unknown): PropertyExtra[] {
  if (!Array.isArray(value)) return [];
  const byKind = new Map<ExtraKind, PropertyExtra>();
  for (const raw of value) {
    if (typeof raw !== "object" || raw === null) continue;
    const e = raw as Record<string, unknown>;
    if (!isExtraKind(e.kind) || !isExtraMode(e.mode)) continue;
    if (byKind.has(e.kind)) continue;
    const detail = typeof e.detail === "string" && e.detail.trim() ? e.detail.trim() : null;
    const delta =
      e.mode === "opcional" && typeof e.price_delta === "number" && Number.isFinite(e.price_delta) && e.price_delta > 0
        ? e.price_delta
        : null;
    byKind.set(e.kind, { kind: e.kind, mode: e.mode, detail, price_delta: delta });
  }
  return EXTRA_KINDS.flatMap((k) => (byKind.has(k) ? [byKind.get(k)!] : []));
}

export function includedExtras(extras: readonly PropertyExtra[]): PropertyExtra[] {
  return extras.filter((e) => e.mode === "incluida");
}

export function optionalExtras(extras: readonly PropertyExtra[]): PropertyExtra[] {
  return extras.filter((e) => e.mode === "opcional");
}

export interface ConfiguredPrice {
  /** Base plus every selected optional extra that has a delta. */
  amount: number | null;
  /** The selected extras, in canonical order. */
  selected: PropertyExtra[];
  /** True when a selected extra has no delta, so the amount is not the whole story. */
  hasUnpriced: boolean;
}

/**
 * The price with a set of optional extras switched on. Included extras never
 * move it — they are already inside `base`. Selecting a kind that is not an
 * optional extra of this listing is ignored rather than trusted.
 */
export function priceWithExtras(
  base: number | null,
  extras: readonly PropertyExtra[],
  selectedKinds: ReadonlySet<ExtraKind>,
): ConfiguredPrice {
  const selected = optionalExtras(extras).filter((e) => selectedKinds.has(e.kind));
  if (base === null) return { amount: null, selected, hasUnpriced: selected.some((e) => e.price_delta === null) };
  let amount = base;
  let hasUnpriced = false;
  for (const e of selected) {
    if (e.price_delta === null) hasUnpriced = true;
    else amount += e.price_delta;
  }
  return { amount, selected, hasUnpriced };
}

/**
 * The extras as short spec words for a card's "2 amb · 1 dorm · 40 m²" line:
 * included ones read as facts ("cochera 00-15"), optional ones say so
 * ("cochera opcional"). Lowercase to sit beside the other specs.
 */
export function extrasSpecWords(extras: readonly PropertyExtra[]): string[] {
  return extras.map((e) =>
    e.mode === "incluida"
      ? extraTitle(e).toLowerCase()
      : `${extraKindLabel(e.kind).toLowerCase()} opcional`,
  );
}
