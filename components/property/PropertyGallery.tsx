"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Fullscreen photo viewer for /p/[id].
 *
 * Until now the detail page painted `photos[0]` and a hardcoded "1/N" — a
 * counter that told the reader there were nineteen more and gave no way to
 * reach them. That was honest when the scraper brought a single photo per
 * listing; the owner loader brings fourteen to twenty.
 *
 * Swiping is CSS scroll-snap, not a gesture handler: the browser's own
 * inertia, rubber-banding and pointer cancellation are better than anything
 * reimplemented here, they cost no JavaScript, and they keep working when
 * the main thread is busy — which on a mid-range phone (§4) is the case that
 * matters. The scroll position is only *read*, to keep the counter honest.
 */
export function PropertyGallery({
  photos,
  alt,
  open,
  initialIndex,
  onClose,
}: {
  photos: string[];
  alt: string;
  open: boolean;
  initialIndex: number;
  onClose: () => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(initialIndex);

  const scrollTo = useCallback((i: number, behavior: ScrollBehavior = "smooth") => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: i * track.clientWidth, behavior });
  }, []);

  // Jump to the photo that was clicked, without animating from photo 1.
  useEffect(() => {
    if (!open) return;
    setIndex(initialIndex);
    const raf = requestAnimationFrame(() => scrollTo(initialIndex, "auto"));
    return () => cancelAnimationFrame(raf);
  }, [open, initialIndex, scrollTo]);

  // The page behind must not scroll while the viewer is over it.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") scrollTo(Math.min(index + 1, photos.length - 1));
      if (e.key === "ArrowLeft") scrollTo(Math.max(index - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, photos.length, onClose, scrollTo]);

  if (!open || photos.length === 0) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Fotos de ${alt}`}
      className="fixed inset-0 z-50 bg-black/95 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
    >
      <div
        ref={trackRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollLeft / el.clientWidth);
          if (i !== index) setIndex(i);
        }}
        className="flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((src, i) => (
          <div key={src} className="relative h-full w-full shrink-0 snap-center">
            <Image
              src={src}
              alt={`${alt} — foto ${i + 1} de ${photos.length}`}
              fill
              sizes="100vw"
              className="object-contain"
              // Neighbours only: loading twenty full-screen photos to show one
              // is the whole mobile budget for a gallery most readers swipe
              // two or three deep.
              priority={i === initialIndex}
              loading={Math.abs(i - index) <= 1 ? "eager" : "lazy"}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar galería"
        className="absolute top-3 right-3 grid size-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
      >
        <X className="size-5" />
      </button>

      <div className="pointer-events-none absolute top-4 left-4 rounded-md bg-black/50 px-2.5 py-1 text-sm font-medium tabular-nums text-white backdrop-blur-sm">
        {index + 1}/{photos.length}
      </div>

      {/* Arrows are desktop-only: on a phone the swipe is the interaction and
          a 44px target over the photo would just be in the way (§2.2). */}
      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => scrollTo(Math.max(index - 1, 0))}
            aria-label="Foto anterior"
            disabled={index === 0}
            className="absolute top-1/2 left-4 hidden -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20 disabled:opacity-30 sm:grid sm:size-11"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollTo(Math.min(index + 1, photos.length - 1))}
            aria-label="Foto siguiente"
            disabled={index === photos.length - 1}
            className="absolute top-1/2 right-4 hidden -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20 disabled:opacity-30 sm:grid sm:size-11"
          >
            <ChevronRight className="size-5" />
          </button>
        </>
      )}
    </div>
  );
}

/**
 * The strip under the hero. Its job is to make the other photos *visible* —
 * a counter alone reads as a label, not as something you can open.
 */
export function PropertyThumbnails({
  photos,
  alt,
  onPick,
}: {
  photos: string[];
  alt: string;
  onPick: (index: number) => void;
}) {
  if (photos.length < 2) return null;
  return (
    <div className="mt-10 flex min-w-0 gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
      {photos.map((src, i) => (
        <button
          key={src}
          type="button"
          onClick={() => onPick(i)}
          aria-label={`Ver foto ${i + 1} de ${photos.length}`}
          className={cn(
            "relative size-16 shrink-0 overflow-hidden rounded-md bg-muted transition-opacity sm:size-20",
            "opacity-80 hover:opacity-100 focus-visible:opacity-100",
          )}
        >
          <Image src={src} alt={`${alt} — miniatura ${i + 1}`} fill sizes="80px" className="object-cover" />
        </button>
      ))}
    </div>
  );
}
