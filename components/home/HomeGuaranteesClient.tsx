"use client";

import { useState } from "react";
import Image from "next/image";
import { ShieldCheck, ScanSearch, FileCheck2 } from "lucide-react";
import {
  useInView,
  useCountUp,
  useAnimatedNumber,
  usePrefersReducedMotion,
} from "@/hooks/use-in-view";
import { getScoreBand, interpolateRingColor } from "@/lib/scoring/bands";
import { cn } from "@/lib/utils";
import { PARCEL_BOX } from "@/lib/map/tiles";

/**
 * Client visuals for the home guarantees section (Block 4 del rediseño).
 * The copy lives in the server component (HomeGuarantees); these are only
 * the scroll-triggered, transform/opacity animations.
 *
 * Two tones, per the approved design:
 *   TONE 1 (sober/editorial) — AreaOutlineViz. An outline draws itself over
 *     real map tiles and names what it is. Pedagogical and quiet
 *     (DIRECCION_DE_ARTE §2.3 — el movimiento explica el proceso de
 *     verificación, no decora). Ink palette, slow draw.
 *   TONE 2 (dynamic/"gamer" controlado) — ScoreRingViz, MatchDemo,
 *     ServiceSteps. The ring draws 0→N (§2.2 revela el dato al instante),
 *     the match reacts to taps (§2.2 — en mobile el tap es el hover), and
 *     the report shows as a numbered sequence (§2.3). Gold accents, faster.
 */

// ---------------------------------------------------------------------------
// Reveal — scroll-triggered entrance with character. Pronounced rise + scale,
// optional directional slide (so catalog cards swing in from their photo
// side). Spring-ish easing so it "settles" rather than fading flatly (§2.4 —
// nada corta en seco). Reduced-motion users get the final state with no
// transition (the hidden classes are motion-safe).
// ---------------------------------------------------------------------------
export function Reveal({
  children,
  delayMs = 0,
  className,
  direction = "up",
}: {
  children: React.ReactNode;
  delayMs?: number;
  className?: string;
  /** Entrance direction. "up" rises; "left"/"right" slide in horizontally. */
  direction?: "up" | "left" | "right";
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const hidden =
    direction === "left"
      ? "motion-safe:opacity-0 motion-safe:-translate-x-10 motion-safe:scale-[0.97]"
      : direction === "right"
        ? "motion-safe:opacity-0 motion-safe:translate-x-10 motion-safe:scale-[0.97]"
        : "motion-safe:opacity-0 motion-safe:translate-y-9 motion-safe:scale-[0.97]";
  return (
    <div
      ref={ref}
      className={cn(
        "motion-safe:transition-all motion-safe:duration-[850ms]",
        inView ? "opacity-100 translate-x-0 translate-y-0 scale-100" : hidden,
        className,
      )}
      style={{
        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        transitionDelay: inView ? `${delayMs}ms` : "0ms",
      }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TONE 1 — ARBA parcel verification (sober, pedagogical)
// ---------------------------------------------------------------------------

/**
 * Shape of last resort, for when no projected outline arrives. Generic on
 * purpose: without a projection there is no map either, so it draws as a
 * plain diagram rather than pretending to sit somewhere real.
 */
const FALLBACK_POINTS = "34,24 150,16 184,78 168,150 58,142 22,86";

export interface ParcelTile {
  url: string;
  left: number;
  top: number;
}

export function AreaOutlineViz({
  outline,
  caption,
  label,
}: {
  /**
   * The shape to draw and the tiles under it, both already projected into
   * PARCEL_BOX by the server. Null keeps the generic outline with no map —
   * honest, because without a projection there is no ground to place.
   */
  outline?: { points: string; tiles: ParcelTile[] } | null;
  /** Names what the shape is. Without it the drawing is decoration. */
  caption?: string;
  /** Accessible description. Must say what is actually drawn. */
  label?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.4 });
  const reduced = usePrefersReducedMotion();

  const points = outline?.points ?? FALLBACK_POINTS;
  const tiles = outline?.tiles ?? [];
  const hasMap = tiles.length > 0;

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-sm">
      {/* Ground under the outline. Tiles are positioned in percentages of
          the same box the SVG uses, so the two scale together at any width
          without a resize listener. */}
      {hasMap && (
        <div
          className="absolute inset-0 overflow-hidden"
          aria-hidden="true"
          style={{
            opacity: inView ? 1 : 0,
            transition: "opacity 900ms ease-out",
            // Dissolve at the edges instead of stopping at a rounded box.
            // A hard frame reads as a screenshot pasted into the page and
            // breaks §2.4 — nada corta en seco. The mask lets the map fade
            // into the section it lives in, so the block has one edge (the
            // polygon) rather than two competing ones.
            maskImage:
              "radial-gradient(ellipse 72% 72% at 50% 50%, #000 45%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 72% 72% at 50% 50%, #000 45%, transparent 100%)",
          }}
        >
          {/* Held back, not drained. Full grayscale at half opacity turned
              the map into flat grey pulp — legible but dead, and it made the
              whole block look faded rather than layered. Keeping a little of
              the map's own colour (the green of the parks, the ochre of the
              avenues) at higher opacity reads as a real map seen through
              paper, which is the register this section wants. */}
          <div className="absolute inset-0 grayscale-[0.55] opacity-[0.78] contrast-[0.95] saturate-[0.9] dark:opacity-[0.4] dark:invert dark:hue-rotate-180">
            {tiles.map((t) => (
              <Image
                key={t.url}
                src={t.url}
                alt=""
                width={256}
                height={256}
                unoptimized
                className="absolute max-w-none"
                style={{
                  left: `${(t.left / PARCEL_BOX.width) * 100}%`,
                  top: `${(t.top / PARCEL_BOX.height) * 100}%`,
                  width: `${(256 / PARCEL_BOX.width) * 100}%`,
                  height: `${(256 / PARCEL_BOX.height) * 100}%`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* The cadastral diagram. All paint via currentColor + opacities
          (color is set to the theme-aware heading token below), so it stays
          visible in dark mode and avoids color-mix in SVG paint attributes. */}
      <svg
        viewBox="0 0 206 166"
        className="w-full"
        role="img"
        aria-label={label ?? caption ?? "Polígono sobre el mapa"}
        style={{ color: "var(--brand-heading)" }}
      >
        {/* Reference grid — a stand-in for context, drawn as lines rather
            than a <pattern>. With real ground underneath it is clutter, so
            it steps aside. */}
        <g
          stroke="currentColor"
          strokeOpacity={hasMap ? 0 : 0.08}
          strokeWidth={1}
        >
          {[34, 69, 103, 137, 172].map((x) => (
            <line key={`v${x}`} x1={x} y1={4} x2={x} y2={162} />
          ))}
          {[28, 55, 83, 110, 138].map((y) => (
            <line key={`h${y}`} x1={4} y1={y} x2={202} y2={y} />
          ))}
        </g>

        {/* Fill — fades in once the outline has finished drawing. */}
        <polygon
          points={points}
          fill="currentColor"
          fillOpacity={0.12}
          className="transition-opacity duration-700"
          style={{
            opacity: inView ? 1 : 0,
            transitionDelay: inView ? "1900ms" : "0ms",
          }}
        />
        {/* Drawn outline — stroke-dashoffset runs full→0 (pathLength=1).
            Thicker + slower than before so the "drawing" reads clearly as a
            pedagogical gesture (§2.3 — el movimiento explica la verificación,
            no decora). The gold pencil dot below traces the same path. */}
        <polygon
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength={1}
          style={{
            strokeDasharray: 1,
            strokeDashoffset: inView || reduced ? 0 : 1,
            transition: reduced ? "none" : "stroke-dashoffset 1900ms cubic-bezier(0.65, 0, 0.35, 1)",
          }}
        />
        {/* Pencil dot — a gold marker that travels the outline as it draws,
            making the "we trace your parcel" idea literal. Hidden for
            reduced-motion (it only makes sense while animating). */}
        {!reduced && (
          <circle r="4" fill="var(--brand-gold)" style={{ opacity: inView ? 1 : 0 }}>
            <animateMotion
              dur="1.9s"
              begin={inView ? "0s" : "indefinite"}
              fill="freeze"
              keyPoints="0;1"
              keyTimes="0;1"
              calcMode="spline"
              keySplines="0.65 0 0.35 1"
              path={`M ${points.split(" ").map((p) => p.replace(",", " ")).join(" L ")} Z`}
            />
          </circle>
        )}
        {/* Vertex ticks — appear once the outline is drawn. */}
        {points.split(" ").map((pt, i) => {
          const [x, y] = pt.split(",").map(Number);
          return (
            <circle
              key={pt}
              cx={x}
              cy={y}
              r="2.5"
              fill="var(--brand-gold)"
              className="transition-opacity duration-300"
              style={{
                opacity: inView ? 1 : 0,
                transitionDelay: inView ? `${1950 + i * 80}ms` : "0ms",
              }}
            />
          );
        })}
      </svg>

      {/* Names what the shape is. A drawn outline with no caption is
          decoration; with one it is a claim the reader can check against the
          town names on the map underneath. */}
      {caption && (
        <p
          className="mt-4 text-center text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground transition-all duration-500"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(6px)",
            transitionDelay: inView ? "2150ms" : "0ms",
          }}
        >
          {caption}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TONE 2 — Quality Score ring (dynamic)
// ---------------------------------------------------------------------------
export function ScoreRingViz({ score }: { score: number }) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.5 });
  const reduced = usePrefersReducedMotion();
  // Count-up matches the ring draw (1600ms) so the number climbs in lockstep
  // with the arc filling.
  const display = useCountUp(score, inView, { durationMs: 1600 });

  const size = 188;
  const sw = 16;
  const radius = (size - sw) / 2;
  const circumference = 2 * Math.PI * radius;
  const band = getScoreBand(score);
  const color = interpolateRingColor(score);
  const fillPct = Math.max(0, Math.min(100, score)) / 100;
  const targetOffset = circumference * (1 - fillPct);

  return (
    <div
      ref={ref}
      className={cn(
        "relative mx-auto motion-safe:transition-transform motion-safe:duration-700",
        inView ? "scale-100" : "motion-safe:scale-90",
      )}
      style={{
        width: size,
        height: size,
        transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.1}
          strokeWidth={sw}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{
            strokeDashoffset: inView || reduced ? targetOffset : circumference,
            // Slower, more dramatic draw + stronger glow so the arc filling
            // has presence (§2.2 — revela el dato con peso).
            transition: reduced ? "none" : "stroke-dashoffset 1600ms cubic-bezier(0.22,1,0.36,1)",
            // Concrete hex + alpha (color is a #rrggbb from interpolateRingColor)
            // — avoids color-mix() inside drop-shadow().
            filter: `drop-shadow(0 0 10px ${color}80)`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-5xl font-extrabold tabular-nums leading-none"
          style={{ color }}
        >
          {Math.round(display)}
        </span>
        <span className="mt-1 text-[0.65rem] uppercase tracking-wider text-muted-foreground">
          / 100
        </span>
        <span className="mt-1 text-sm font-semibold" style={{ color }}>
          {band.label}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TONE 2 — Match demo (reacts to taps; §2.2)
// ---------------------------------------------------------------------------
const MATCH_CRITERIA = [
  { key: "zona", label: "Zona", weight: 38 },
  { key: "precio", label: "Precio", weight: 34 },
  { key: "ambientes", label: "Ambientes", weight: 28 },
] as const;

export function MatchDemo() {
  // Start with two of three "on" so the meter lands on a believable value.
  const [active, setActive] = useState<Record<string, boolean>>({
    zona: true,
    precio: true,
    ambientes: false,
  });
  const target = MATCH_CRITERIA.reduce(
    (sum, c) => sum + (active[c.key] ? c.weight : 0),
    0,
  );
  const display = useAnimatedNumber(target, { durationMs: 500 });
  const band = getScoreBand(Math.round(display));

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
            Match
          </p>
          <p
            className="text-4xl font-extrabold tabular-nums leading-none"
            style={{ color: band.hex }}
          >
            {Math.round(display)}
          </p>
        </div>
        <p className="text-xs text-muted-foreground pb-1">
          Tocá los criterios →
        </p>
      </div>

      {/* Meter — scaleX transform (GPU), reacts to the toggles with a slight
          overshoot so the response feels snappy (§2.2). */}
      <div className="mt-3 h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full origin-left motion-safe:transition-transform motion-safe:duration-[450ms]"
          style={{
            backgroundColor: band.hex,
            transform: `scaleX(${Math.max(0, Math.min(100, display)) / 100})`,
            transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {MATCH_CRITERIA.map((c) => {
          const on = active[c.key];
          return (
            <button
              key={c.key}
              type="button"
              aria-pressed={on}
              onClick={() => setActive((s) => ({ ...s, [c.key]: !s[c.key] }))}
              className={cn(
                "min-h-11 rounded-full border px-4 text-sm font-medium transition-all duration-200",
                "active:scale-90 motion-safe:hover:scale-[1.04]",
                on
                  ? "border-transparent bg-primary text-primary-foreground shadow-sm"
                  : "bg-card text-muted-foreground hover:border-primary/40",
              )}
            >
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TONE 2 — Service steps (numbered sequence; §2.3)
// ---------------------------------------------------------------------------
const SERVICE_STEPS = [
  { icon: ScanSearch, label: "Verificamos la partida", sub: "Contra el padrón de ARBA" },
  { icon: ShieldCheck, label: "Consultamos ARBA en vivo", sub: "Superficie, nomenclatura, polígono" },
  { icon: FileCheck2, label: "Generás el informe en PDF", sub: "Al instante, desde la plataforma" },
] as const;

export function ServiceSteps() {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.4 });

  const goldLine = "#D4A24C8C"; // brand gold ~55% — concrete, no color-mix

  return (
    <div ref={ref} className="mx-auto w-full max-w-xl">
      <ol className="relative space-y-6 sm:space-y-0 sm:flex sm:gap-4">
        {/* Connector line — fills along the sequence axis. Two elements so
            each gets the correct origin/axis per breakpoint (mobile draws
            top→down, desktop left→right). §2.3: the line advancing IS the
            process. */}
        <div
          aria-hidden
          className="absolute left-[1.35rem] top-3 bottom-3 w-0.5 origin-top rounded-full sm:hidden motion-safe:transition-transform motion-safe:duration-[1100ms] motion-safe:ease-out"
          style={{ backgroundColor: goldLine, transform: inView ? "scaleY(1)" : "scaleY(0)" }}
        />
        <div
          aria-hidden
          className="absolute hidden sm:block left-12 right-12 top-[1.35rem] h-0.5 origin-left rounded-full motion-safe:transition-transform motion-safe:duration-[1100ms] motion-safe:ease-out"
          style={{ backgroundColor: goldLine, transform: inView ? "scaleX(1)" : "scaleX(0)" }}
        />
        {SERVICE_STEPS.map((step, i) => {
          const Icon = step.icon;
          const delay = 200 + i * 300;
          return (
            <li
              key={step.label}
              className="relative flex items-start gap-4 sm:flex-col sm:items-center sm:text-center sm:flex-1"
            >
              {/* Icon circle lights up gold in sequence — the step-by-step
                  reveal. Text stays readable without JS (only the accent
                  animates), so the content degrades gracefully. */}
              <span
                className="relative z-10 grid size-11 shrink-0 place-items-center rounded-full border-2 bg-background transition-colors duration-500"
                style={{
                  borderColor: inView ? "var(--brand-gold)" : "var(--border)",
                  color: inView ? "var(--brand-gold)" : "var(--muted-foreground)",
                  transitionDelay: inView ? `${delay}ms` : "0ms",
                }}
              >
                <Icon className="size-5" />
              </span>
              <div className="pt-1 sm:pt-3">
                <p className="text-sm font-semibold" style={{ color: "var(--brand-heading)" }}>
                  <span className="text-muted-foreground mr-1.5 tabular-nums">{i + 1}.</span>
                  {step.label}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{step.sub}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
