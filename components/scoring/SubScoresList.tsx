import type { QualityBreakdown, SubScoreId } from "@/lib/scoring";
import { interpolateRingColor } from "@/lib/scoring/bands";

/**
 * Compact list of the 5 sub-scores: name + value + a thin bar colored by
 * the sub-score's own value (not by the parent score).
 *
 * Sub-scores with confidence < 0.3 are shown muted with "sin datos
 * suficientes" rather than misleading the reader with a bar that looks
 * confident. Confidence between 0.3 and 1.0 renders a normal bar with a
 * small "(parcial)" hint.
 */

const SUBSCORE_LABELS: Record<SubScoreId, string> = {
  documentation: "Documentación",
  price_vs_comparables: "Precio vs zona",
  listing_quality: "Calidad del aviso",
  time_on_market: "Tiempo en mercado",
  arba_coherence: "Coherencia ARBA",
};

/** Render order — most important first. */
const SUBSCORE_ORDER: SubScoreId[] = [
  "documentation",
  "price_vs_comparables",
  "arba_coherence",
  "listing_quality",
  "time_on_market",
];

interface SubScoresListProps {
  breakdown: QualityBreakdown;
}

export function SubScoresList({ breakdown }: SubScoresListProps) {
  return (
    <ul className="space-y-3">
      {SUBSCORE_ORDER.map((id) => {
        const sub = breakdown.subscores[id];
        if (!sub) return null;
        const muted = sub.confidence === 0;
        const partial = sub.confidence > 0 && sub.confidence < 1;
        const color = muted ? "#94A3B8" : interpolateRingColor(sub.value);
        const widthPct = muted ? 0 : Math.max(2, sub.value);
        return (
          <li key={id} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">{SUBSCORE_LABELS[id]}</span>
              <span
                className="font-semibold tabular-nums"
                style={{ color: muted ? undefined : color }}
              >
                {muted ? "—" : Math.round(sub.value)}
                {partial && (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    (parcial)
                  </span>
                )}
              </span>
            </div>
            <div
              className="h-1.5 w-full rounded-full bg-muted overflow-hidden"
              aria-hidden
            >
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${widthPct}%`, background: color }}
              />
            </div>
            <p className="text-xs text-muted-foreground leading-snug">
              {sub.reason}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
