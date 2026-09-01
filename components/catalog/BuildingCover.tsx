"use client";

import { useState } from "react";
import Image from "next/image";
import { Building2, Expand } from "lucide-react";
import { PropertyGallery } from "@/components/property/PropertyGallery";

/**
 * The building's cover photo, openable at full size.
 *
 * A 56px thumbnail is enough to recognise a building you already know and not
 * enough to look at one you don't — which is the whole reason the photo is
 * hand-picked in lib/buildings/photos (a façade, not a kitchen). Being unable
 * to open it made that choice pointless.
 *
 * The viewer is the one /p/[id] already uses, with a single photo instead of a
 * gallery: same escape key, same backdrop, same close button (§2.5 — a visitor
 * who opens a unit's photos later meets an interaction they have already
 * learned). The expand glyph is always visible rather than appearing on hover,
 * because on a phone there is no hover and an image that silently happens to
 * be tappable is an image nobody taps (§2.2).
 */
export function BuildingCover({
  photo,
  label,
}: {
  photo: string | null;
  label: string;
}) {
  const [open, setOpen] = useState(false);

  const box =
    "relative size-14 sm:size-16 shrink-0 overflow-hidden rounded-2xl bg-muted";

  if (!photo) {
    return (
      <div className={box} aria-hidden>
        <span className="flex size-full items-center justify-center">
          <Building2 className="size-6 text-muted-foreground" aria-hidden />
        </span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Ver la foto de ${label} en grande`}
        className={`${box} group cursor-zoom-in transition-transform hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-2`}
        style={{ outlineColor: "var(--brand-gold)" }}
      >
        <Image src={photo} alt={label} fill sizes="64px" className="object-cover" />
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 flex h-6 items-end justify-end bg-gradient-to-t from-black/60 to-transparent p-1"
        >
          <Expand className="size-3 text-white/90" />
        </span>
      </button>

      <PropertyGallery
        photos={[photo]}
        alt={label}
        open={open}
        initialIndex={0}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
