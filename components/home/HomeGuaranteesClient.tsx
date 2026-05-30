"use client";

import { useState } from "react";
import { ShieldCheck, ScanSearch, FileCheck2 } from "lucide-react";
import {
  useInView,
  useCountUp,
  useAnimatedNumber,
  usePrefersReducedMotion,
} from "@/hooks/use-in-view";
import { getScoreBand, interpolateRingColor } from "@/lib/scoring/bands";
import { cn } from "@/lib/utils";

/**
 * Client visuals for the home guarantees section (Block 4 del rediseño).
 * The copy lives in the server component (HomeGuarantees); these are only
 * the scroll-triggered, transform/opacity animations.
 *
 * Two tones, per the approved design:
 *   TONE 1 (sober/editorial) — ArbaParcelViz. A parcel polygon draws
 *     itself, the partida appears, the m² counts up. Pedagogical and quiet
 *     (DIRECCION_DE_ARTE §2.3 — el movimiento explica el proceso de
 *     verificación, no decora). Ink palette, slow draw.
 *   TONE 2 (dynamic/"gamer" controlado) — ScoreRingViz, MatchDemo,
 *     ServiceSteps. The ring draws 0→N (§2.2 revela el dato al instante),
 *     the match reacts to taps (§2.2 — en mobile el tap es el hover), and
 *     the report shows as a numbered sequence (§2.3). Gold accents, faster.
 */

// ---------------------------------------------------------------------------
// Reveal — fade + slide-up when scrolled into view. Reduced-motion users get
// the final state with no transition (the hidden classes are motion-safe).
// ---------------------------------------------------------------------------
export function Reveal({
  children,
  delayMs = 0,
  className,
}: {
  children: React.ReactNode;
  delayMs?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={cn(
        "motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out",
        inView ? "opacity-100 translate-y-0" : "motion-safe:opacity-0 motion-safe:translate-y-4",
        className,
      )}
      style={{ transitionDelay: inView ? `${delayMs}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TONE 1 — ARBA parcel verification (sober, pedagogical)
// ---------------------------------------------------------------------------

/** Irregular lot outline — a believable parcel, not a perfect rectangle. */
const PARCEL_POINTS = "34,24 150,16 184,78 168,150 58,142 22,86";

export function ArbaParcelViz({
  surfaceM2,
  partida,
}: {
  /** Real ARBA surface of the featured property; the readout hides when absent. */
  surfaceM2?: number | null;
  /** Real partida of the featured property; the readout hides when absent. */
  partida?: string | null;
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.4 });
  const reduced = usePrefersReducedMotion();
  const hasSurface = typeof surfaceM2 === "number" && Number.isFinite(surfaceM2);
  const hasPartida = typeof partida === "string" && partida.trim() !== "";
  const m2 = useCountUp(hasSurface ? (surfaceM2 as number) : 0, inView, {
    durationMs: 1300,
  });

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-sm">
      {/* The cadastral diagram. All paint via currentColor + opacities
          (color is set to the theme-aware heading token below), so it stays
          visible in dark mode and avoids color-mix in SVG paint attributes. */}
      <svg
        viewBox="0 0 206 166"
        className="w-full"
        role="img"
        aria-label="Polígono catastral de una parcela verificada contra ARBA"
        style={{ color: "var(--brand-heading)" }}
      >
        {/* Faint reference grid — drawn lines (no <pattern>), the cadastral
            lattice. currentColor at low opacity. */}
        <g stroke="currentColor" strokeOpacity={0.08} strokeWidth={1}>
          {[34, 69, 103, 137, 172].map((x) => (
            <line key={`v${x}`} x1={x} y1={4} x2={x} y2={162} />
          ))}
          {[28, 55, 83, 110, 138].map((y) => (
            <line key={`h${y}`} x1={4} y1={y} x2={202} y2={y} />
          ))}
        </g>

        {/* Filled parcel — fades in after the outline draws. */}
        <polygon
          points={PARCEL_POINTS}
          fill="currentColor"
          fillOpacity={0.1}
          className="transition-opacity duration-700"
          style={{
            opacity: inView ? 1 : 0,
            transitionDelay: inView ? "700ms" : "0ms",
          }}
        />
        {/* Drawn outline — stroke-dashoffset runs full→0 (pathLength=1). */}
        <polygon
          points={PARCEL_POINTS}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          pathLength={1}
          style={{
            strokeDasharray: 1,
            strokeDashoffset: inView || reduced ? 0 : 1,
            transition: reduced ? "none" : "stroke-dashoffset 1200ms ease-in-out",
          }}
        />
        {/* Vertex ticks — appear once the outline is drawn. */}
        {PARCEL_POINTS.split(" ").map((pt, i) => {
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
                transitionDelay: inView ? `${900 + i * 60}ms` : "0ms",
              }}
            />
          );
        })}
      </svg>

      {/* Read-outs below the diagram — the REAL partida + surface of the
          featured property. Each hides when the data is absent; we never
          fabricate a value. */}
      {(hasPartida || hasSurface) && (
        <div
          className="mt-4 flex items-center justify-between gap-3 text-sm transition-all duration-500"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(6px)",
            transitionDelay: inView ? "1000ms" : "0ms",
          }}
        >
          {hasPartida && (
            <div>
              <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                Partida
              </p>
              <p className="font-mono tabular-nums" style={{ color: "var(--brand-heading)" }}>
                {partida}
              </p>
            </div>
          )}
          {hasSurface && (
            <div className="ml-auto text-right">
              <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                Superficie ARBA
              </p>
              <p
                className="font-semibold tabular-nums"
                style={{ color: "var(--brand-heading)" }}
              >
                {Math.round(m2)} m²
              </p>
            </div>
          )}
        </div>
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
  const display = useCountUp(score, inView, { durationMs: 1200 });

  const size = 188;
  const sw = 14;
  const radius = (size - sw) / 2;
  const circumference = 2 * Math.PI * radius;
  const band = getScoreBand(score);
  const color = interpolateRingColor(score);
  const fillPct = Math.max(0, Math.min(100, score)) / 100;
  const targetOffset = circumference * (1 - fillPct);

  return (
    <div ref={ref} className="relative mx-auto" style={{ width: size, height: size }}>
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
            transition: reduced ? "none" : "stroke-dashoffset 1200ms cubic-bezier(0.22,1,0.36,1)",
            // Concrete hex + alpha (color is a #rrggbb from interpolateRingColor)
            // — avoids color-mix() inside drop-shadow().
            filter: `drop-shadow(0 0 6px ${color}59)`,
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

      {/* Meter — scaleX transform (GPU), reacts to the toggles. */}
      <div className="mt-3 h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full origin-left motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out"
          style={{
            backgroundColor: band.hex,
            transform: `scaleX(${Math.max(0, Math.min(100, display)) / 100})`,
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
                "min-h-11 rounded-full border px-4 text-sm font-medium transition-colors",
                on
                  ? "border-transparent bg-primary text-primary-foreground"
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
