import { cn } from "@/lib/utils";

/**
 * The "Oferta" ribbon — the one element on the site that is allowed to shout.
 *
 * Tomy, 16-sep-2026: the gold chip read as one more informative pill and
 * nobody saw it. An offer is the broker choosing to say "this one, now", and
 * that has to be read before the address, before the price. A gold plate
 * with navy on it, slightly tilted, that hangs OVER the edge of whatever
 * carries it (§2.6, the thing that breaks out of its quadrant, in miniature).
 *
 * It was a warm red until 18-sep-2026, outside the brand's two colours on
 * purpose. Tomy brought it back inside: gold on a white card is already
 * where the eye lands, and the red was one more thing to explain.
 *
 * Three sizes for three distances: the card in the catalog, the hero of the
 * listing, and the protagonist on the landing. Static on purpose — a badge
 * that pulses is a badge you learn to ignore (§6).
 *
 * `OfferPrice` puts the number on the same plate (Tomy, 18-sep: "hacele un
 * recuadro como el de oferta al precio"), so the two read as one object. A
 * price that is not on offer stays plain navy: the plate is what says "this
 * one, now", and a plate on every price would say nothing.
 */
export function OfferBadge({
  size = "md",
  className,
  tilt = true,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
  /** False for inline use next to a number, where a tilt would look broken. */
  tilt?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md font-extrabold uppercase leading-none tracking-[0.16em] shadow-lg",
        size === "sm" && "px-2 py-1 text-[0.62rem]",
        size === "md" && "px-3 py-1.5 text-[0.72rem]",
        size === "lg" && "px-4 py-2 text-sm",
        tilt && "-rotate-3",
        className,
      )}
      style={{
        backgroundColor: "var(--offer)",
        color: "var(--offer-fg)",
        boxShadow: "0 8px 20px -8px color-mix(in srgb, var(--offer) 70%, transparent)",
      }}
    >
      Oferta
    </span>
  );
}

/**
 * A price on the offer plate. Same gold and same corners as the ribbon beside
 * it, without the tilt — a number set on an angle is a number you read twice.
 *
 * Only for a price that IS the offer. The list price it discounts from is not
 * shown anywhere: Tomy dropped it on 18-sep ("el de lista desaparece
 * directamente") after seeing it struck through in grey.
 */
export function OfferPrice({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center rounded-md px-3 py-1.5 shadow-lg", className)}
      style={{
        backgroundColor: "var(--offer)",
        color: "var(--offer-fg)",
        boxShadow: "0 8px 20px -8px color-mix(in srgb, var(--offer) 70%, transparent)",
      }}
    >
      {children}
    </span>
  );
}
