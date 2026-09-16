import { cn } from "@/lib/utils";

/**
 * The "Oferta" ribbon — the one element on the site that is allowed to shout.
 *
 * Tomy, 16-sep-2026: the gold chip read as one more informative pill and
 * nobody saw it. An offer is the broker choosing to say "this one, now", and
 * that has to be read before the address, before the price. So this steps a
 * little outside the navy + gold line on purpose (DIRECCION_DE_ARTE §7, the
 * golden rule: it reinforces trust — the claim is explicit, not buried — and
 * it is one punctual gesture, not a pattern): a warm red plate, slightly
 * tilted, that hangs OVER the edge of whatever carries it (§2.6, the thing
 * that breaks out of its quadrant, in miniature).
 *
 * Three sizes for three distances: the card in the catalog, the hero of the
 * listing, and the protagonist on the landing. Static on purpose — a badge
 * that pulses is a badge you learn to ignore (§6).
 *
 * The same red colours the price beside it, via the `--offer` token, so the
 * ribbon and the number read as one statement. Nothing else uses that red.
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
