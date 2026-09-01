"use client";

import { useAnimatedNumber } from "@/hooks/use-in-view";
import { getMatchBand } from "@/lib/matching/bands";
import { cn } from "@/lib/utils";

/**
 * The match, as a number and a bar.
 *
 * A meter and not a ring, on purpose. The ring belongs to the Quality Score —
 * on this page, in the admin, and on the home — and the two measure different
 * things: the score is a property's, identical for everyone; the match is
 * yours, and the same property scores differently for the next visitor.
 * Giving them one shape would make the distinction the whole site rests on
 * disappear into a styling choice (§2.5).
 *
 * The 100 case paints in the brand blue rather than the band's green, matching
 * what the home's demo already established: gold at the top is the Quality
 * Score's trophy tier, shared across ten surfaces, and repeating it here would
 * read as the same badge for a different measurement.
 *
 * Colour and label are keyed off `target`, not the animating value — a
 * count-up to 100 passes through the lower bands, and reading them off the
 * tween would flash "No encaja" on the way to "Match perfecto". They ease in
 * CSS instead (§2.4, nada corta en seco).
 */

/**
 * The tweening number, remounted whenever the score goes from unknown to
 * known and back.
 *
 * `useAnimatedNumber` starts settled at mount and animates from wherever it
 * was after that — which is right while a visitor adjusts criteria, and wrong
 * the first time a score exists at all. Coming from "—" there is no previous
 * number to travel from, so the tween ran 0 → 87 and the meter spent half a
 * second reading "0" beside the label "Match perfecto". Remounting on that
 * transition makes the first real value simply appear, and leaves every
 * subsequent change animating as before.
 */
function AnimatedScore({ target, color }: { target: number; color: string }) {
  const display = useAnimatedNumber(target, { durationMs: 500 });
  return (
    <p
      className="text-4xl font-extrabold tabular-nums leading-none motion-safe:transition-colors motion-safe:duration-[450ms]"
      style={{ color }}
    >
      {Math.round(display)}
    </p>
  );
}

export function MatchMeter({
  score,
  caption,
  className,
}: {
  /** 0-100, or null when nothing could be evaluated. */
  score: number | null;
  /** Line under the number. Should say what the number is *of*. */
  caption?: string;
  className?: string;
}) {
  const known = score !== null && Number.isFinite(score);
  const target = score ?? 0;
  const band = getMatchBand(score);
  const color = target >= 100 ? "var(--match-perfect)" : band.hex;

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
            Tu match
          </p>
          {known ? (
            <AnimatedScore key="known" target={target} color={color} />
          ) : (
            <p
              className="text-4xl font-extrabold tabular-nums leading-none"
              style={{ color }}
            >
              —
            </p>
          )}
        </div>
        <p
          className="pb-1 text-sm font-medium motion-safe:transition-colors motion-safe:duration-[450ms]"
          style={{ color }}
        >
          {band.label}
        </p>
      </div>

      <div className="mt-3 h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full origin-left motion-safe:transition-[transform,background-color] motion-safe:duration-[450ms]"
          style={{
            backgroundColor: color,
            transform: `scaleX(${Math.max(0, Math.min(100, known ? target : 0)) / 100})`,
            transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        />
      </div>

      {caption && (
        <p className="mt-2.5 text-xs text-muted-foreground">{caption}</p>
      )}
    </div>
  );
}
