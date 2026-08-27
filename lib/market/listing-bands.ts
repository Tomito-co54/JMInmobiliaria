/**
 * Colour bands for reading a property list at a glance.
 *
 * Two axes, and they are deliberately different in kind:
 *
 *   Age has a direction. A listing that has sat for six months is worse than
 *   one posted last week, full stop, so its scale runs one way — neutral to
 *   red — and the thresholds are the ones a broker already thinks in.
 *
 *   Price per m² does not. "Expensive" is not a defect and "cheap" is not a
 *   virtue; both are only interesting as distance from what comparable
 *   properties ask. So it is scored against the median of its own type
 *   rather than any absolute number — 900 USD/m² is dear for a lote and a
 *   bargain for a departamento — and the extremes get colour while the
 *   middle deliberately stays quiet.
 *
 * Keeping this out of the components means the same number can never be
 * green in one table and red in another.
 */

export interface Band {
  /** Tailwind classes, dark-mode aware. Empty for the neutral band. */
  className: string;
  /** Shown on hover. Explains what the colour means. */
  title: string;
}

const NEUTRAL: Band = { className: "", title: "" };

// ---------------------------------------------------------------------------
// Age
// ---------------------------------------------------------------------------

/** Day counts where a listing's story changes, per market convention. */
export const AGE_FRESH_DAYS = 30;
export const AGE_STALE_DAYS = 90;
export const AGE_VERY_STALE_DAYS = 180;

export function describeAge(days: number | null): Band {
  if (days === null) return NEUTRAL;
  if (days > AGE_VERY_STALE_DAYS) {
    return {
      className: "text-red-600 dark:text-red-400 font-medium",
      title: `${days} días publicada — más de 6 meses sin venderse`,
    };
  }
  if (days > AGE_STALE_DAYS) {
    return {
      className: "text-orange-600 dark:text-orange-400",
      title: `${days} días publicada — pasó los 3 meses`,
    };
  }
  if (days > AGE_FRESH_DAYS) {
    return {
      className: "text-amber-600 dark:text-amber-500",
      title: `${days} días publicada`,
    };
  }
  return { className: "text-muted-foreground", title: `${days} días publicada` };
}

// ---------------------------------------------------------------------------
// Price per m² against the median of its type
// ---------------------------------------------------------------------------

/** Distance from the median before a value is worth colouring. */
export const PRICE_DEVIATION_PCT = 25;

export function describePriceVsMarket(
  usdPerM2: number | null,
  medianForType: number | null,
): Band {
  if (usdPerM2 === null || medianForType === null || medianForType <= 0) {
    return NEUTRAL;
  }
  const deltaPct = Math.round((100 * (usdPerM2 - medianForType)) / medianForType);
  const vs = `${Math.abs(deltaPct)}% ${deltaPct > 0 ? "sobre" : "bajo"} la mediana del tipo (${Math.round(medianForType).toLocaleString("es-AR")} USD/m²)`;

  if (deltaPct > PRICE_DEVIATION_PCT) {
    return { className: "text-red-600 dark:text-red-400", title: vs };
  }
  if (deltaPct < -PRICE_DEVIATION_PCT) {
    return { className: "text-emerald-700 dark:text-emerald-400", title: vs };
  }
  return { className: "text-muted-foreground", title: vs };
}

/**
 * Days a listing has been on the market.
 *
 * Scraped rows count from the first time the crawler saw them, which is the
 * closest thing we have to a publication date. Owner properties are never
 * scraped, so they count from when they were loaded.
 */
export function listingAgeDays(row: {
  first_seen_at?: string | null;
  created_at?: string | null;
}): number | null {
  const start = row.first_seen_at ?? row.created_at ?? null;
  if (!start) return null;
  const ms = new Date(start).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.floor((Date.now() - ms) / 86_400_000));
}
