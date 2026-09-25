"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { NavPending } from "@/components/shared/NavPending";
import { OfferBadge, OfferPrice } from "@/components/property/OfferBadge";
import { skipsOptimizer } from "@/lib/property/photo-source";
import { BASEMAP_TILE_PIXELS, type PlacedTile } from "@/lib/map/tiles";
import { cn } from "@/lib/utils";

/**
 * The zone covers as a slider — the piece Tomy liked on the Villa del Dique
 * site (25-sep-2026), turned into navigation: each slide is a zone, not a
 * property, and it exists because the agency publishes there.
 *
 * What was kept from the reference: the ground of the place full-bleed
 * behind, a white card floating on it with the property's photo large on
 * the right, one price, one button, the dots — and, since 25-sep-2026 at
 * Tomy's request, the slides move on their own. Swiping is CSS scroll-snap,
 * like the gallery: the browser's own gesture, no handler to get wrong. The
 * arrows, the dots and the timer scroll the same track, so there is one
 * state and it is the scroll position.
 *
 * The auto-advance is built so it never fights the visitor: it waits a full
 * interval after any move of theirs (a swipe, an arrow, a dot), it holds
 * while the pointer or a finger is on the slider, while the focus is inside,
 * while the section is off screen or the tab is hidden, and it does not run
 * at all for someone who asked for less motion. There is a pause button next
 * to the dots, because moving content needs one the visitor can reach.
 *
 * transform/opacity only; 44px targets; keyboard arrows while focus is
 * inside.
 */

/** Long enough to read a card: a zone, a property, a price. */
const AUTOPLAY_MS = 6000;

export interface ZonaSlide {
  zona: { key: string; name: string; tagline: string; photo: string | null };
  /** Published listings in the zone. */
  count: number;
  /** The catalog, filtered to the zone. */
  href: string;
  /** The map of the zone, when there is no photo. */
  tiles: PlacedTile[];
  property: {
    id: string;
    headline: string;
    place: string | null;
    priceText: string | null;
    offer: boolean;
    specs: string[];
    cover: string | null;
  };
}

export function HomeZonasSlider({ slides }: { slides: ZonaSlide[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const count = slides.length;

  // When the slider last moved, by anyone. The timer waits a full interval
  // after it, so a visitor who just swiped is not swiped back.
  const lastMove = useRef(0);
  const held = useRef(false); // pointer over it, or a finger on it
  const focused = useRef(false);
  const inView = useRef(false);
  const [playing, setPlaying] = useState(true);

  const scrollTo = useCallback((i: number) => {
    const el = track.current;
    if (!el) return;
    lastMove.current = Date.now();
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    el.scrollTo({
      left: i * el.clientWidth,
      behavior: reduced ? "auto" : "smooth",
    });
  }, []);

  // The scroll position is the state: a swipe, an arrow, a dot and the timer
  // all end here, so the dots can never disagree with what is on screen.
  const onScroll = useCallback(() => {
    const el = track.current;
    if (!el || el.clientWidth === 0) return;
    lastMove.current = Date.now();
    const i = Math.max(
      0,
      Math.min(count - 1, Math.round(el.scrollLeft / el.clientWidth)),
    );
    indexRef.current = i;
    setIndex(i);
  }, [count]);

  // Arrow keys while the focus is inside the section.
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = section.current;
    if (!el || count < 2) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") scrollTo(Math.min(index + 1, count - 1));
      if (e.key === "ArrowLeft") scrollTo(Math.max(index - 1, 0));
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [index, count, scrollTo]);

  // The auto-advance. One coarse tick that checks every guard and moves only
  // when a full interval has passed since anybody last moved the slider.
  useEffect(() => {
    const el = section.current;
    if (!el || count < 2 || !playing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        inView.current = entry.isIntersecting;
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    const tick = window.setInterval(() => {
      if (!inView.current || held.current || focused.current) return;
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastMove.current < AUTOPLAY_MS) return;
      scrollTo((indexRef.current + 1) % count);
    }, 500);
    return () => {
      io.disconnect();
      window.clearInterval(tick);
    };
  }, [count, playing, scrollTo]);

  return (
    <section
      ref={section}
      aria-roledescription="carrusel"
      aria-label="Las zonas donde publicamos"
      className="relative"
      onMouseEnter={() => (held.current = true)}
      onMouseLeave={() => (held.current = false)}
      onPointerDown={() => (held.current = true)}
      onPointerUp={() => (held.current = false)}
      onPointerCancel={() => (held.current = false)}
      onFocusCapture={() => (focused.current = true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null))
          focused.current = false;
      }}
    >
      <div
        ref={track}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((s, i) => (
          <Slide
            key={s.zona.key}
            slide={s}
            position={i + 1}
            total={count}
            first={i === 0}
          />
        ))}
      </div>

      {count > 1 && (
        <>
          {/* Arrows: a desktop thing. On a phone the gesture is the swipe. */}
          <button
            type="button"
            onClick={() => scrollTo(Math.max(index - 1, 0))}
            disabled={index === 0}
            aria-label="Zona anterior"
            className={cn(
              "absolute left-2 top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[var(--brand-navy)] shadow-lg backdrop-blur md:inline-flex",
              "transition-opacity disabled:opacity-0 motion-safe:hover:scale-105",
            )}
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => scrollTo(Math.min(index + 1, count - 1))}
            disabled={index === count - 1}
            aria-label="Zona siguiente"
            className={cn(
              "absolute right-2 top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[var(--brand-navy)] shadow-lg backdrop-blur md:inline-flex",
              "transition-opacity disabled:opacity-0 motion-safe:hover:scale-105",
            )}
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>

          {/* Dots: the zone names, so they are not just dots. 44px targets.
              And the pause, because content that moves needs one in reach. */}
          <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-label={
                playing
                  ? "Pausar el paso de zonas"
                  : "Reanudar el paso de zonas"
              }
              aria-pressed={!playing}
              className="inline-flex size-11 items-center justify-center rounded-full text-white/70 transition-colors hover:text-white"
            >
              {playing ? (
                <Pause className="size-3.5" aria-hidden />
              ) : (
                <Play className="size-3.5" aria-hidden />
              )}
            </button>
            <div className="flex gap-1" role="tablist" aria-label="Elegir zona">
                {slides.map((s, i) => (
                  <button
                    key={s.zona.key}
                    type="button"
                    role="tab"
                    aria-selected={i === index}
                    aria-label={s.zona.name}
                    onClick={() => scrollTo(i)}
                    className="group inline-flex min-h-11 min-w-11 items-center justify-center px-1"
                  >
                    <span
                      className={cn(
                        "block h-2 rounded-full bg-white transition-all duration-300",
                        i === index
                          ? "w-7 opacity-100"
                          : "w-2 opacity-50 group-hover:opacity-80",
                      )}
                    />
                  </button>
                ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function Slide({
  slide: s,
  position,
  total,
  first,
}: {
  slide: ZonaSlide;
  position: number;
  total: number;
  first: boolean;
}) {
  const p = s.property;
  return (
    <article
      aria-roledescription="zona"
      aria-label={`${s.zona.name}, ${position} de ${total}`}
      className="relative w-full shrink-0 snap-center overflow-hidden"
    >
      {/* ---- The ground: the zone's photo, or its map ---- */}
      <div
        aria-hidden
        className="absolute inset-0 [container-type:size]"
        style={{ background: "var(--brand-navy)" }}
      >
        {s.zona.photo ? (
          <Image
            src={s.zona.photo}
            alt=""
            fill
            sizes="100vw"
            priority={first}
            className="object-cover"
          />
        ) : (
          s.tiles.length > 0 && (
            // A 16:9 layer that always covers the slide, whatever its shape,
            // so the tiles scale together and the streets keep their angles.
            <div className="absolute left-1/2 top-1/2 aspect-video w-[max(100cqw,177.78cqh)] -translate-x-1/2 -translate-y-1/2 scale-[1.04] blur-[2px] opacity-90">
              {s.tiles.map((t) => (
                <Image
                  key={t.url}
                  src={t.url}
                  alt=""
                  width={BASEMAP_TILE_PIXELS}
                  height={BASEMAP_TILE_PIXELS}
                  unoptimized
                  className="absolute max-w-none"
                  style={{
                    left: t.left,
                    top: t.top,
                    width: t.width,
                    height: t.height,
                  }}
                />
              ))}
            </div>
          )
        )}
        {/* The tint: navy, heavier at the top where the card's text sits. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--brand-navy) 82%, transparent) 0%, color-mix(in srgb, var(--brand-navy) 58%, transparent) 100%)",
          }}
        />
      </div>

      {/* ---- The card ---- */}
      <div className="relative px-4 pb-16 pt-12 sm:pb-20 sm:pt-16">
        <div className="mx-auto max-w-6xl">
          <div className="relative grid grid-cols-1 overflow-hidden rounded-3xl bg-card shadow-2xl md:grid-cols-[1fr_1.15fr]">
            {/* The bar at the edge, the gold of the brand: the one thing on
                the card that is not the property. */}
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 z-10 w-1.5"
              style={{ background: "var(--brand-gold)" }}
            />

            <div className="order-2 flex flex-col p-7 sm:p-10 md:order-1 md:p-12">
              <p
                className="text-[0.7rem] font-medium uppercase tracking-[0.22em] sm:text-xs"
                style={{ color: "var(--brand-accent)" }}
              >
                Zona · {s.count} {s.count === 1 ? "propiedad" : "propiedades"}
              </p>
              <h2
                className="mt-2 font-heading text-4xl font-medium leading-none tracking-tight sm:text-5xl"
                style={{ color: "var(--brand-heading)" }}
              >
                {s.zona.name}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {s.zona.tagline}
              </p>

              <div
                className="my-6 h-px w-12"
                style={{ background: "var(--brand-gold)" }}
              />

              <p className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {p.offer ? "Oportunidad en oferta" : "Propiedad destacada"}
              </p>
              <h3
                className="mt-1.5 font-heading text-2xl font-medium leading-tight tracking-tight sm:text-3xl"
                style={{ color: "var(--brand-heading)" }}
              >
                {p.headline}
              </h3>
              {p.place && (
                <p className="mt-1 text-sm text-muted-foreground">{p.place}</p>
              )}

              {p.priceText ? (
                <p className="mt-4 text-2xl font-bold leading-none tabular-nums sm:text-3xl">
                  {p.offer ? (
                    <OfferPrice>{p.priceText}</OfferPrice>
                  ) : (
                    <span style={{ color: "var(--price)" }}>{p.priceText}</span>
                  )}
                </p>
              ) : (
                <p className="mt-4 text-xl font-bold leading-none text-muted-foreground">
                  Consultar precio
                </p>
              )}
              {p.specs.length > 0 && (
                <p className="mt-3 text-sm text-muted-foreground">
                  {p.specs.join(" · ")}
                </p>
              )}

              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
                <Link
                  href={`/p/${p.id}`}
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "group relative min-h-12 gap-1.5 px-7 text-base",
                    "transition-transform duration-200 ease-out motion-safe:hover:scale-[1.03] motion-safe:active:scale-[0.97]",
                  )}
                >
                  Ver propiedad
                  <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
                  <NavPending className="inset-x-4 bottom-1" />
                </Link>
                <Link
                  href={s.href}
                  className="group relative inline-flex min-h-11 items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
                  style={{ color: "var(--brand-heading)" }}
                >
                  Ver todo en {s.zona.name}
                  <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                  <NavPending className="inset-x-0 bottom-1" />
                </Link>
              </div>
            </div>

            {/* The photo: the listing is the picture. */}
            <Link
              href={`/p/${p.id}`}
              aria-label={`Ver ${p.headline}`}
              className="group relative order-1 block aspect-[4/3] min-h-56 overflow-hidden bg-muted md:order-2 md:aspect-auto md:min-h-[26rem]"
            >
              {p.cover && (
                <Image
                  src={p.cover}
                  alt={p.headline}
                  fill
                  sizes="(max-width: 768px) 100vw, 640px"
                  priority={first}
                  unoptimized={skipsOptimizer(p.cover)}
                  className="object-cover transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.03]"
                />
              )}
              {p.offer && (
                <OfferBadge size="lg" className="absolute left-4 top-4 z-10" />
              )}
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
