"use client";

import { useInView, useCountUp, usePrefersReducedMotion } from "@/hooks/use-in-view";
import { getScoreBand, interpolateRingColor } from "@/lib/scoring/bands";
import { SubScoresList } from "@/components/scoring/SubScoresList";
import { ScoreBreakdownSheet } from "@/components/scoring/ScoreBreakdownSheet";
import type { QualityBreakdown } from "@/lib/scoring";

/**
 * Quality score block for the detail page — NOT a card. Lives inside the
 * sticky data panel (desktop) / the credential stack (mobile). The ring
 * draws 0→N + counts up when it scrolls into view (§2.2 revela el dato al
 * instante). Reuses SubScoresList + ScoreBreakdownSheet unchanged.
 *
 * Mirrors the home's ScoreRingViz behaviour so the score reads the same
 * across surfaces (§2.5 mundo cohesivo).
 */
export function PropertyScorePanel({ breakdown }: { breakdown: QualityBreakdown | null }) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.4 });
  const reduced = usePrefersReducedMotion();
  const score = breakdown?.score ?? null;
  const hasScore = score !== null && Number.isFinite(score);
  const display = useCountUp(hasScore ? (score as number) : 0, inView, { durationMs: 1100 });

  if (!breakdown) {
    return (
      <div className="text-sm text-muted-foreground">
        Score todavía no calculado. Aparecerá en la próxima corrida del pipeline.
      </div>
    );
  }

  const size = 132;
  const sw = 11;
  const radius = (size - sw) / 2;
  const circumference = 2 * Math.PI * radius;
  const band = getScoreBand(score);
  const color = interpolateRingColor(score);
  const fillPct = hasScore ? Math.max(0, Math.min(100, score as number)) / 100 : 0;
  const targetOffset = circumference * (1 - fillPct);

  return (
    <div ref={ref} className="space-y-5">
      <div className="flex items-center gap-4">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
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
            {hasScore && (
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
                  transition: reduced
                    ? "none"
                    : "stroke-dashoffset 1100ms cubic-bezier(0.22,1,0.36,1)",
                }}
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-extrabold tabular-nums leading-none" style={{ color }}>
              {hasScore ? Math.round(display) : "—"}
            </span>
            <span className="text-[0.6rem] uppercase tracking-wider text-muted-foreground mt-0.5">
              / 100
            </span>
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Quality Score
          </p>
          <p className="text-lg font-semibold leading-tight" style={{ color }}>
            {band.label}
          </p>
          <p className="text-xs text-muted-foreground mt-1 leading-snug">
            Calidad del aviso, coherencia ARBA, tiempo en mercado y precio vs. comparables.
          </p>
        </div>
      </div>

      <SubScoresList breakdown={breakdown} />
      <ScoreBreakdownSheet breakdown={breakdown} />
    </div>
  );
}
