"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageIcon, ShieldCheck, Expand } from "lucide-react";
import { usePrefersReducedMotion } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils";
import { PropertyGallery, PropertyThumbnails } from "./PropertyGallery";

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
 * The cover opens a fullscreen viewer and a thumbnail strip sits under it.
 * Both arrived with the owner loader: the hero painted photos[0] and a
 * hardcoded "1/N" for as long as the scraper brought one photo per listing,
 * which turned into nineteen unreachable photos the moment real listings
 * were loaded by hand.
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
  const [openAt, setOpenAt] = useState<number | null>(null);
  const cover = photos[0];
  const total = photos.length;

  return (
    <div className="-mx-4 lg:mx-0">
      <PropertyGallery
        photos={photos}
        alt={alt}
        open={openAt !== null}
        initialIndex={openAt ?? 0}
        onClose={() => setOpenAt(null)}
      />
      {/* Own positioning context: the score medallion and the verified chip hang
          off the photo's bottom edge, and measured against the whole
          component they landed on the thumbnail strip instead. */}
      <div className="relative">
      {/* 4:3 on desktop made the hero ~590px tall in a two-column layout —
          the photo pushed everything else below the fold. Wider and shorter
          as the viewport grows: the stage should frame the room, not fill
          the screen with it. */}
      <div className="relative aspect-[4/3] sm:aspect-[16/10] lg:aspect-[16/9] w-full overflow-hidden bg-muted lg:rounded-3xl">
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
            score medallion + verified chip below. */}
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

        {/* The counter is the affordance now, not a label: it says how many
            there are and opens them. Covers the whole photo so the obvious
            gesture — tapping the picture — works too. */}
        {cover && (
          <button
            type="button"
            onClick={() => setOpenAt(0)}
            aria-label={`Ver las ${total} fotos`}
            className="absolute inset-0 cursor-zoom-in"
          >
            <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-md bg-black/55 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
              <Expand className="size-3.5" />
              {total > 1 ? `1/${total}` : "1/1"}
            </span>
          </button>
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

      {/* Verification chip — bottom-right, the second credibility anchor on
          the photo. It still fires off the cadastral lookup; it just no longer
          names the bureau, because what earns trust here is that somebody
          checked, not which office answered. */}
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
          Propiedad verificada
        </div>
      )}
      </div>

      {/* Below the photo, clearing the medallion that overlaps its corner. */}
      <div className="px-4 lg:px-0">
        <PropertyThumbnails photos={photos} alt={alt} onPick={setOpenAt} />
      </div>
    </div>
  );
}
