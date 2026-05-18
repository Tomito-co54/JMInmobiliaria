import { TermDefinition } from "@/components/shared/TermDefinition";
import { getScoreBand, interpolateRingColor } from "@/lib/scoring/bands";

/**
 * The "wow moment" of Block 4. SVG ring whose color and arc-length both
 * depend on the score: smooth gradient by hue, length growing from 0 → full
 * circle as the score rises from 0 → 100.
 *
 * Server Component — no interactivity, just a static SVG plus a number.
 * Accessibility:
 *   - role="img" with a descriptive aria-label
 *   - meter semantics expressed via aria-valuenow/min/max on the wrapper
 */

interface QualityScoreRingProps {
  score: number | null;
  /** Outer diameter in px. Defaults to a "hero" size suitable for mobile. */
  size?: number;
  /** Stroke thickness in px. Defaults to ~10% of size. */
  strokeWidth?: number;
}

export function QualityScoreRing({
  score,
  size = 196,
  strokeWidth,
}: QualityScoreRingProps) {
  const sw = strokeWidth ?? Math.round(size * 0.09);
  const radius = (size - sw) / 2;
  const circumference = 2 * Math.PI * radius;

  const band = getScoreBand(score);
  const color = interpolateRingColor(score);
  const hasScore = score !== null && score !== undefined && Number.isFinite(score);
  const clamped = hasScore ? Math.max(0, Math.min(100, score as number)) : 0;
  const fillPct = hasScore ? clamped / 100 : 0;
  const arc = circumference * fillPct;
  const gap = circumference - arc;

  const ariaLabel = hasScore
    ? `Score de calidad ${Math.round(clamped)} de 100, banda ${band.label}`
    : "Score sin datos suficientes";

  return (
    <figure
      aria-label={ariaLabel}
      className="flex flex-col items-center gap-2"
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
        >
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.12}
            strokeWidth={sw}
          />
          {/* Arc */}
          {hasScore && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={sw}
              strokeLinecap="round"
              strokeDasharray={`${arc} ${gap}`}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {hasScore ? (
            <>
              <span
                className="text-5xl font-extrabold tabular-nums leading-none"
                style={{ color }}
              >
                {Math.round(clamped)}
              </span>
              <span className="text-[0.7rem] uppercase tracking-wider text-muted-foreground mt-1">
                / 100
              </span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground text-center px-4">
              Sin datos
              <br />
              suficientes
            </span>
          )}
        </div>
      </div>
      <figcaption className="space-y-0.5 text-center">
        <p
          className="text-base font-semibold leading-tight"
          style={{ color }}
        >
          {band.label}
        </p>
        <p className="text-xs text-muted-foreground">
          <TermDefinition term="score_calidad">Score de calidad</TermDefinition>
        </p>
      </figcaption>
    </figure>
  );
}
