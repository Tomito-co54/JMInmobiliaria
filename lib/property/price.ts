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
 * A price, or `null` when there is no price to show. Callers already branch
 * on the null — they were branching on `price_amount !== null` before this
 * existed.
 *
 * **The period is opt-in, and that is a deliberate trade.** A rent has to be
 * legible as monthly, but the price is not the only place that can say so:
 * where the listing already carries "Casa en alquiler" beside it, "por mes"
 * on the number is the same fact twice, and the label says it better because
 * it says it before the reader has decided what the number means.
 *
 * So `period: true` is for the places with no such label next to them — a
 * building's "desde" line summarising a cohort, and anywhere a price travels
 * without its listing. Pass it there and nowhere else; the rule is not "never
 * show the period", it is "never show a rent that nothing marks as a rent".
 *
 * `compact` shortens that period when it is shown: `/mes` rather than
 * ` por mes`. It never drops it.
 */
export function formatPrice(
  amount: number | null | undefined,
  currency: PriceCurrency | null | undefined,
  operation: OperationType | null | undefined,
  opts: { compact?: boolean; period?: boolean } = {},
): string | null {
  if (amount === null || amount === undefined) return null;
  if (!currency) return null;
  if (!Number.isFinite(amount)) return null;
  const suffix = opts.period
    ? pricePeriodSuffix(operation ?? null, opts.compact ?? false)
    : "";
  return `${currencySymbol(currency)} ${formatAmount(amount)}${suffix}`;
}

/**
 * Puts the operation into the label that names the property: "Casa" becomes
 * "Casa en alquiler".
 *
 * Takes an already-resolved label rather than a raw `property_type` because
 * the surfaces disagree on vocabulary on purpose — the catalog card says
 * "Departamento" and the narrow legacy card says "Depto" — and unifying that
 * here would be a rendering decision made in the wrong place.
 *
 * Returns the label untouched when the operation is unknown, so a listing
 * loaded without one reads as it always did instead of trailing an "en".
 */
export function labelWithOperation(
  typeLabel: string | null | undefined,
  operation: OperationType | null | undefined,
): string | null {
  if (!typeLabel) return operationNoun(operation);
  const op = operationLabel(operation);
  return op ? `${typeLabel} ${op}` : typeLabel;
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
