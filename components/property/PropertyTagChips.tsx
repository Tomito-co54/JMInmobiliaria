import { readTags, tagEmphasis, tagLabel } from "@/lib/property/tags";
import { cn } from "@/lib/utils";

/**
 * The broker's labels on a listing — "Apto comercial", "Oferta", "A estrenar".
 *
 * One component for every surface so the same tag cannot look like two
 * different claims on the card and on the listing. Two variants, for the two
 * grounds they sit on:
 *
 *   surface — on the card, the protagonista, the panel: a quiet outlined pill
 *             in the text colour, the way the spec line beside it reads.
 *   overlay — over the hero photo, next to the address: frosted white so it
 *             survives any picture underneath.
 *
 * "Oferta" is the one tag that is about the price and not the place, and it
 * gets the gold accent (DIRECCION_DE_ARTE §1: gold is for small accent labels).
 * The others describe the property and stay in the text colour — a second
 * loud chip would only compete with the first (§6: movimiento/adorno sin
 * función, applied to colour).
 *
 * Renders nothing when there is nothing to say. Not interactive, so the 44px
 * rule does not apply here; the editor's toggles are a different component.
 */
export function PropertyTagChips({
  tags,
  variant = "surface",
  className,
}: {
  tags: unknown;
  variant?: "surface" | "overlay";
  className?: string;
}) {
  const list = readTags(tags);
  if (list.length === 0) return null;

  return (
    <ul className={cn("flex flex-wrap items-center gap-1.5", className)} aria-label="Etiquetas">
      {list.map((tag) => {
        const emphasis = tagEmphasis(tag);
        return (
          <li
            key={tag}
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-1 text-[0.66rem] font-semibold uppercase leading-none tracking-[0.14em]",
              variant === "overlay"
                ? emphasis
                  ? "border-transparent text-[var(--brand-navy)]"
                  : "border-white/35 bg-white/15 text-white backdrop-blur-sm"
                : emphasis
                  ? "border-transparent"
                  : "border-border bg-background/60 text-foreground/80",
            )}
            style={
              emphasis
                ? variant === "overlay"
                  ? { backgroundColor: "var(--brand-gold)" }
                  : {
                      backgroundColor:
                        "color-mix(in srgb, var(--brand-accent) 22%, transparent)",
                      color: "var(--brand-heading)",
                    }
                : undefined
            }
          >
            {tagLabel(tag)}
          </li>
        );
      })}
    </ul>
  );
}
