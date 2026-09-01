"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, SlidersHorizontal } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MatchMeter } from "@/components/matching/MatchMeter";
import { MatchPreferencesForm } from "@/components/matching/MatchPreferencesForm";
import { useMatchPreferences } from "@/hooks/use-match-preferences";
import { bestMatch, type MatchableProperty } from "@/lib/matching";
import { getMatchBand } from "@/lib/matching/bands";
import { cn } from "@/lib/utils";

/**
 * The match, reachable from the header on every public page.
 *
 * The criteria used to live at the bottom of the landing and nowhere else, so
 * a visitor who arrived at /propiedades — which is now where the catalog is —
 * had no way to reach them at all, and one who landed on the home had to
 * scroll past the whole argument to find the one control that is about them.
 *
 * Nothing here is a second source of truth. It reads and writes the same
 * `sessionStorage` answers as the home builder and the listing panel through
 * `useMatchPreferences`, which broadcasts on change — so adjusting a criterion
 * up here moves the meter on the home behind it in the same frame, and the
 * listing you open next is already scored against it.
 *
 * The trigger shows the number rather than only a label. A filter whose result
 * is invisible until you open it gives no reason to open it, and the number is
 * the reason (§2.2 — the payoff has to be visible, not behind an interaction).
 */
export function MatchQuickFilter({
  properties,
  compact = false,
}: {
  properties: MatchableProperty[];
  /**
   * Drop the score from the trigger below `sm`, keeping only the icon.
   *
   * The header row at 375px is a fixed budget: two catalog destinations, the
   * theme toggle and — for the broker, who is the only account there is — the
   * Panel button. Measured, that budget has about 25px of slack, and a
   * 44px-tall control with a number in it does not fit in 25px. So the number
   * gives way for the one person who is logged in, and stays for every
   * visitor, who is who it is for.
   */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [justChanged, setJustChanged] = useState(false);
  const { preferences, setPreferences, ready } = useMatchPreferences();

  // Before the first client read lands, show the neutral trigger: the server
  // and the first client render agree, and a score that is about to arrive
  // never flashes as a dash.
  const best = ready ? bestMatch(properties, preferences) : null;
  const band = getMatchBand(best?.score ?? null);
  const color =
    best && best.score >= 100 ? "var(--match-perfect)" : band.hex;

  // The criteria can be answered somewhere the trigger is not: the builder at
  // the foot of the landing, or the panel on a listing. In those the number up
  // here changes while the reader is looking two screens away, and a value
  // that swaps silently is a value nobody learns is connected to anything. The
  // pulse is the one job §2 allows an animation that reveals nothing new —
  // guiding the eye to what moved.
  const score = best?.score ?? null;
  const previous = useRef<number | null>(null);
  useEffect(() => {
    const had = previous.current;
    previous.current = score;
    if (had === null || score === null || had === score) return;
    setJustChanged(true);
    const t = setTimeout(() => setJustChanged(false), 600);
    return () => clearTimeout(t);
  }, [score]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={
          best
            ? `Tu match: ${best.score} de 100. Abrir los criterios de búsqueda`
            : "Decinos qué buscás y calculamos tu match"
        }
        className={cn(
          "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-2 sm:px-3.5",
          "text-sm font-medium transition-colors",
          "hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2",
          "data-[popup-open]:bg-accent",
          // Scale only, and only while the popover is shut — pulsing the
          // anchor of an open popover would drag the popover with it.
          !open &&
            "motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out",
          !open && justChanged && "motion-safe:scale-110",
        )}
        style={best ? { borderColor: color } : undefined}
      >
        <SlidersHorizontal className="size-4 shrink-0" aria-hidden />
        {/* At 375px the nav already carries two destinations, the theme
            toggle and — for the broker, who is always logged in — the Panel
            button. The word is what gives way; the number does not, because
            without it the control is a mystery icon. */}
        <span className="hidden sm:inline">Tu match</span>
        {best && (
          <span
            className={cn(
              "tabular-nums font-bold",
              compact && "hidden sm:inline",
            )}
            style={{ color }}
          >
            {best.score}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={10}
        // Base UI's default is "first tabbable element, or the popup", and
        // the first tabbable element here is the link to the best match —
        // which would mean opening the filter and pressing Enter navigates
        // away from the page you opened it on. Point it at the panel instead:
        // still inside the popup, so focus is not stranded outside it, but
        // nothing that Enter can activate.
        initialFocus={() => panelRef.current}
        // Narrower than the viewport at 375px and a fixed column above it.
        // The criteria are the same six the home asks, so this can get tall:
        // it scrolls inside itself rather than pushing the page around.
        className="w-[calc(100vw-1.5rem)] max-w-[380px] max-h-[min(75vh,600px)] overflow-y-auto overscroll-contain gap-4 p-4"
      >
        <div ref={panelRef} tabIndex={-1} className="outline-none">
          <MatchMeter
            score={best?.score ?? null}
            caption={
              best
                ? undefined
                : "Elegí lo que buscás y el match se calcula solo, acá mismo."
            }
          />
        </div>

        {best && (
          <Link
            href={`/p/${best.property.id}`}
            onClick={() => setOpen(false)}
            className="-mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            {best.property.address ?? "Ver la propiedad"}
            <ArrowRight className="size-4 shrink-0" aria-hidden />
          </Link>
        )}

        <MatchPreferencesForm value={preferences} onChange={setPreferences} />
      </PopoverContent>
    </Popover>
  );
}
