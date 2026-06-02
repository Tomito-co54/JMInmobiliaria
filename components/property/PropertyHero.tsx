"use client";

import Image from "next/image";
import { ImageIcon, ShieldCheck } from "lucide-react";
import { usePrefersReducedMotion } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils";

/**
 * Property detail hero (rediseño /p/[id]).
 *
 * The photo stops being a centered generic rectangle and becomes the stage:
 * full-bleed on mobile (breaks the container padding), large and framed on
 * desktop. Address + type float over a bottom gradient, and the Quality
 * Score medallion overlaps a corner (§2.1 — el dato serio sobre la imagen,
 * mismo lenguaje que HomeProtagonist).
 *
 * Animation: the image fades + scales in (1.04 → 1) on mount — §2.1
 * profundidad con intención (la propiedad "se acerca"). Respects
 * prefers-reduced-motion. Only transform/opacity (§4).
 *
 * Honesty: the scraper brings only photos[0] today, so we keep the "1/N"
 * counter and don't fake a gallery (the swipe gallery is a known follow-up).
 */

interface PropertyHeroProps {
  photos: string[];
  alt: string;
  address: string | null;
  partido: string | null;
  typeLabel: string;
  opLabel: string | null;
  score: number | null;
  scoreBandLabel: string;
  scoreBandHex: string;
  arbaVerified: boolean;
}

export function PropertyHero({
  photos,
  alt,
  address,
  partido,
  typeLabel,
  opLabel,
  score,
  scoreBandLabel,
  scoreBandHex,
  arbaVerified,
}: PropertyHeroProps) {
  const reduced = usePrefersReducedMotion();
  const cover = photos[0];
  const total = photos.length;

  return (
    <div className="relative -mx-4 lg:mx-0">
      <div className="relative aspect-[4/3] sm:aspect-[16/10] lg:aspect-[4/3] w-full overflow-hidden bg-muted lg:rounded-3xl">
        {cover ? (
          <Image
            src={cover}
            alt={alt}
            fill
            sizes="(max-width: 1024px) 100vw, 720px"
            priority
            className={cn(
              "object-cover",
              !reduced && "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-[1.04] motion-safe:duration-[900ms]",
            )}
          />
        ) : (
          <div className="size-full grid place-items-center text-muted-foreground">
            <div className="flex flex-col items-center gap-2 text-sm">
              <ImageIcon className="size-8" />
              <span>Sin foto disponible</span>
            </div>
          </div>
        )}

        {/* Bottom gradient so the floating text stays legible over any photo. */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/65 via-black/25 to-transparent"
        />

        {/* Floating identity: eyebrow + address. Fraunces address. Extra
            bottom padding leaves the lower strip clear for the overlapping
            score medallion + ARBA chip below. */}
        <div className="absolute inset-x-0 bottom-0 p-4 pb-12 sm:p-6 sm:pb-14 lg:p-7 lg:pb-16">
          <p className="text-[0.7rem] uppercase tracking-[0.2em] font-medium text-white/85">
            {[typeLabel, opLabel].filter(Boolean).join(" · ")}
          </p>
          {address && (
            <h1 className="mt-1 font-heading font-medium text-2xl sm:text-3xl leading-tight tracking-tight text-white drop-shadow-sm">
              {address}
              {partido && (
                <span className="block text-base sm:text-lg font-normal text-white/80 mt-0.5">
                  {partido}
                </span>
              )}
            </h1>
          )}
        </div>

        {/* Photo counter — honest about gallery state. */}
        {cover && (
          <div className="absolute top-3 right-3 rounded-md bg-black/55 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
            1/{total > 1 ? total : 1}
          </div>
        )}
      </div>

      {/* Score medallion — overlaps the photo's bottom-left corner (§2.1). */}
      {score !== null && (
        <div
          className={cn(
            "absolute -bottom-5 left-4 lg:left-6 flex items-center gap-2.5 rounded-2xl border bg-background/95 backdrop-blur px-3.5 py-2.5 shadow-xl",
            !reduced &&
              "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-700 motion-safe:[animation-delay:400ms] motion-safe:fill-mode-backwards",
          )}
          style={{ borderColor: `color-mix(in srgb, ${scoreBandHex} 40%, transparent)` }}
        >
          <span
            className="text-3xl font-extrabold tabular-nums leading-none"
            style={{ color: scoreBandHex }}
          >
            {score}
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">
              Quality
            </span>
            <span className="text-xs font-semibold" style={{ color: scoreBandHex }}>
              {scoreBandLabel}
            </span>
          </span>
        </div>
      )}

      {/* ARBA chip — bottom-right, the second credibility anchor on the photo. */}
      {arbaVerified && (
        <div
          className={cn(
            "absolute -bottom-4 right-4 lg:right-6 inline-flex items-center gap-1.5 rounded-full border bg-background/95 backdrop-blur px-3 py-1.5 text-xs font-medium shadow-lg",
            !reduced &&
              "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-700 motion-safe:[animation-delay:550ms] motion-safe:fill-mode-backwards",
          )}
          style={{
            color: "var(--brand-gold)",
            borderColor: "color-mix(in srgb, var(--brand-gold) 35%, transparent)",
          }}
        >
          <ShieldCheck className="size-3.5" />
          Verificada con ARBA
        </div>
      )}
    </div>
  );
}
