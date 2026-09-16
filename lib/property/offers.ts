import { readTags } from "@/lib/property/tags";

/**
 * What "en oferta" means for the site, in one place.
 *
 * An offer is the `oferta` tag — the broker's claim, never derived from the
 * number. Two things read it: the surfaces that paint the ribbon, and the
 * landing, whose protagonist is the offer when there is one (Tomy,
 * 16-sep-2026: "esa oferta tiene que ser la principal; si hay varias, la más
 * barata").
 *
 * Pure, no I/O.
 */

export function isOnOffer(tags: unknown): boolean {
  return readTags(tags).includes("oferta");
}

export interface OfferCandidate {
  tags: unknown;
  price_amount: number | null;
  price_currency: "USD" | "ARS" | null;
}

/**
 * The cheapest listing on offer, or null when none is.
 *
 * "Cheapest" only means something within one currency: 1.900.000 pesos a
 * month and 69.900 dollars are not on the same scale, and comparing the raw
 * numbers would make the dollar sale "cheaper" every time. So the pool is
 * one currency — dollars when any dollar offer exists, because that is what
 * the catalog is priced in — and the winner is the lowest price in it. A
 * listing on offer without a price cannot be the cheapest of anything and is
 * skipped. Ties keep the first, so the caller's order decides.
 */
export function cheapestOffer<T extends OfferCandidate>(rows: readonly T[]): T | null {
  const offers = rows.filter((r) => isOnOffer(r.tags) && r.price_amount !== null && r.price_amount > 0);
  if (offers.length === 0) return null;
  const usd = offers.filter((r) => r.price_currency === "USD");
  const pool = usd.length > 0 ? usd : offers;
  return pool.reduce((best, r) => (r.price_amount! < best.price_amount! ? r : best));
}
