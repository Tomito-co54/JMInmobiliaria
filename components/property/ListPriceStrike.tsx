import { formatPrice, type PriceCurrency } from "@/lib/property/price";
import { cn } from "@/lib/utils";

/**
 * The list price, struck through, beside the offer price (Tomy, 18-sep-2026).
 *
 * It exists so the offer says what it saves instead of asking the reader to
 * remember. Grey and smaller on purpose: it is the number that is NOT in
 * force, and it must never compete with the one that is.
 *
 * Renders nothing unless there is an offer price below it — a struck number
 * with nothing beating it would read as a price we withdrew. The period
 * ("por mes") is deliberately left off: it is already on the live price
 * right beside it, and twice makes the pair read as two listings.
 */
export function ListPriceStrike({
  amount,
  currency,
  className,
}: {
  amount: number | null;
  currency: PriceCurrency | null;
  className?: string;
}) {
  const text = formatPrice(amount, currency, null);
  if (!text) return null;
  return (
    <span
      className={cn("font-normal text-muted-foreground line-through decoration-[1.5px]", className)}
      // Said out loud a struck number is just another price; this is the one
      // place where the styling carries the meaning.
      aria-label={`Precio de lista ${text}`}
    >
      {text}
    </span>
  );
}
