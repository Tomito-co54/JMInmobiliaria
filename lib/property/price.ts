/**
 * The one place that turns a price into text a visitor reads.
 *
 * It exists because a price is not a number plus a currency: it is a number,
 * a currency and *what is being sold*. `USD 80.000` is a complete statement
 * about a sale and an incomplete one about a rental, where the same glyphs
 * mean "per month" and nothing on screen says so. Until rentals existed the
 * shortcut was harmless — the catalog was sale-only, so every surface could
 * print `{currency} {amount}` inline and be right. Six surfaces did exactly
 * that, which is six places to forget.
 *
 * So the period lives with the formatting, not with the caller.
 *
 * Pure, no I/O. Every public surface that shows a price goes through here.
 */

export type OperationType = "venta" | "alquiler";
export type PriceCurrency = "USD" | "ARS";

/**
 * How the currency is written for an Argentine reader.
 *
 * `$` alone means pesos here — it is the local currency's own sign, and
 * writing `ARS` at a buyer is accounting notation, not price tags. Dollars
 * are always said out loud as such, so they keep the explicit code: an
 * unqualified `$` on a dollar price is the single most expensive ambiguity
 * this function could produce.
 */
export function currencySymbol(currency: PriceCurrency): string {
  return currency === "ARS" ? "$" : "USD";
}

/** Thousands separators, Argentine convention (80.000, not 80,000). */
export function formatAmount(amount: number): string {
  return Math.round(amount).toLocaleString("es-AR");
}

/**
 * The period a price is quoted for.
 *
 * A sale price has none, and an *unknown* operation also gets none — on
 * purpose. Guessing "por mes" for a listing whose operation was never set
 * would be inventing the one fact the reader most needs, which is the class
 * of error this module was written to end.
 */
export function pricePeriodSuffix(
  operation: OperationType | null,
  compact = false,
): string {
  if (operation !== "alquiler") return "";
  return compact ? "/mes" : " por mes";
}

/**
 * A price, complete and unambiguous, or `null` when there is no price to
 * show. Callers already branch on the null — they were branching on
 * `price_amount !== null` before this existed.
 *
 * `compact` is for cards and other tight spots: `$ 500.000/mes` instead of
 * `$ 500.000 por mes`. It shortens the period, never drops it.
 */
export function formatPrice(
  amount: number | null | undefined,
  currency: PriceCurrency | null | undefined,
  operation: OperationType | null | undefined,
  opts: { compact?: boolean } = {},
): string | null {
  if (amount === null || amount === undefined) return null;
  if (!currency) return null;
  if (!Number.isFinite(amount)) return null;
  const suffix = pricePeriodSuffix(operation ?? null, opts.compact ?? false);
  return `${currencySymbol(currency)} ${formatAmount(amount)}${suffix}`;
}

/** "en venta" / "en alquiler" — reads after a noun ("Departamento en venta"). */
export function operationLabel(operation: OperationType | null | undefined): string | null {
  if (operation === "venta") return "en venta";
  if (operation === "alquiler") return "en alquiler";
  return null;
}

/** "Venta" / "Alquiler" — standalone, for chips and headings. */
export function operationNoun(operation: OperationType | null | undefined): string | null {
  if (operation === "venta") return "Venta";
  if (operation === "alquiler") return "Alquiler";
  return null;
}

export function isRental(operation: OperationType | null | undefined): boolean {
  return operation === "alquiler";
}

/**
 * Names a mixed set of listings for a heading.
 *
 * The catalog page used to hardcode "Propiedades en venta", which was true
 * for as long as the only thing loadable was a sale. It answers from the set
 * itself so the page cannot outlive its own title: sale-only reads "en
 * venta", rental-only "en alquiler", and a mixed catalog drops the qualifier
 * rather than leading with a half-truth.
 */
export function catalogOperationLabel(
  operations: ReadonlyArray<OperationType | null | undefined>,
): string | null {
  let hasSale = false;
  let hasRental = false;
  for (const op of operations) {
    if (op === "venta") hasSale = true;
    else if (op === "alquiler") hasRental = true;
  }
  if (hasSale && !hasRental) return "en venta";
  if (hasRental && !hasSale) return "en alquiler";
  return null;
}
