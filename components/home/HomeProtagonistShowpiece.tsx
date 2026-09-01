"use client";

import Image from "next/image";
import Link from "next/link";
import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils";

/**
 * Client island for the protagonist showpiece — the photo that breaks out of
 * the quadrant (§2.6) plus the overlapping score medallion (§2.1).
 *
 * Why a client island: the parent HomeProtagonist is a Server Component and
 * lives BELOW the fold. The old version used `animate-in` (fires on mount),
 * so by the time you scrolled here the entrance had already finished — it
 * looked static. This runs the gesture on SCROLL into view instead, so the
 * photo visibly "arrives": it rises + scales up + rotates into its final
 * -2.5° tilt while the shadow deepens (§2.4 settle, not a flat fade). The
 * medallion and the bare corner land after, with weight (§2.1 — the serious
 * datum sits on top of the audacious composition).
 *
 * transform/opacity only, motion-safe via useInView's reduced-motion-aware
 * transitions (the hidden state is only applied when motion is allowed).
 */
export function HomeProtagonistShowpiece({
  id,
  cover,
  headline,
  score,
  bandHex,
  bandLabel,
}: {
  id: string;
  cover: string | null;
  headline: string;
  score: number | null;
  bandHex: string;
  bandLabel: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.35 });

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-sm md:max-w-none">
      {/* Rigid quadrant — fades/scales in first, the stage the photo breaks
          out of. */}
      <div
        aria-hidden
        className={cn(
          "aspect-square rounded-[2rem] border motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out",
          inView ? "opacity-100 scale-100" : "motion-safe:opacity-0 motion-safe:scale-95",
        )}
        style={{
          backgroundColor: "var(--brand-icon-bg)",
          borderColor: "color-mix(in srgb, var(--brand-navy) 12%, transparent)",
          backgroundImage:
            "linear-gradient(color-mix(in srgb, var(--brand-navy) 5%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--brand-navy) 5%, transparent) 1px, transparent 1px)",
          backgroundSize: "2.25rem 2.25rem",
        }}
      />

      {/* The framed photo, broken out of the quadrant. It ARRIVES: from
          lower + smaller + un-rotated → into its tilted, shadowed resting
          pose. Hover still lifts/un-rotates a touch (§2.2). */}
      <Link
        href={`/p/${id}`}
        aria-label={`Ver ${headline}`}
        className="group absolute -top-6 right-3 sm:-top-8 sm:-right-4 w-[88%] block focus-visible:outline-none"
      >
        <div
          className={cn(
            "relative aspect-[4/3] rounded-2xl overflow-hidden ring-[6px] ring-background",
            "motion-safe:transition-all motion-safe:duration-[900ms]",
            "group-hover:rotate-[-1deg] group-hover:scale-[1.02] group-focus-visible:rotate-[-1deg]",
            inView
              ? "opacity-100 translate-y-0 rotate-[-2.5deg] scale-100 shadow-2xl"
              : "motion-safe:opacity-0 motion-safe:translate-y-10 motion-safe:rotate-0 motion-safe:scale-90 shadow-none",
          )}
          style={{
            transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
            transitionDelay: inView ? "180ms" : "0ms",
          }}
        >
          {cover ? (
            <Image
              src={cover}
              alt={headline}
              fill
              sizes="(max-width: 768px) 88vw, 440px"
              className="object-cover"
              priority
            />
          ) : (
            <div
              className="size-full grid place-items-center"
              style={{ backgroundColor: "var(--brand-icon-bg)" }}
            />
          )}
        </div>
      </Link>

      {/* Score medallion — overlaps the photo's corner (§2.1). Lands last,
          popping in with a touch of overshoot so the credibility datum has
          weight. */}
      {score !== null && (
        <div
          className={cn(
            "absolute -bottom-4 -left-2 sm:-left-5 flex items-center gap-2.5 rounded-2xl border bg-background/95 backdrop-blur px-3.5 py-2.5 shadow-xl",
            "motion-safe:transition-all motion-safe:duration-700",
            inView
              ? "opacity-100 translate-y-0 scale-100"
              : "motion-safe:opacity-0 motion-safe:translate-y-3 motion-safe:scale-90",
          )}
          style={{
            borderColor: `color-mix(in srgb, ${bandHex} 40%, transparent)`,
            transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
            transitionDelay: inView ? "620ms" : "0ms",
          }}
        >
          <span
            className="text-3xl font-extrabold tabular-nums leading-none"
            style={{ color: bandHex }}
          >
            {score}
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">
              Quality
            </span>
            <span className="text-xs font-semibold" style={{ color: bandHex }}>
              {bandLabel}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
