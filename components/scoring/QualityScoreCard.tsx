import { QualityScoreRing } from "./QualityScoreRing";
import { SubScoresList } from "./SubScoresList";
import { ScoreBreakdownSheet } from "./ScoreBreakdownSheet";
import type { QualityBreakdown } from "@/lib/scoring";

/**
 * The full score block: ring + sub-scores list + "ver desglose" sheet trigger.
 * One import for any surface (public page, admin page, future pages) that
 * wants to show the score.
 *
 * When breakdown is null, we render a soft placeholder rather than nothing —
 * a property without a score still gets a visual cue that the score "will be
 * computed soon" (the daily pipeline will catch it).
 */

interface QualityScoreCardProps {
  breakdown: QualityBreakdown | null;
}

export function QualityScoreCard({ breakdown }: QualityScoreCardProps) {
  if (!breakdown) {
    return (
      <section className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
        Score todavía no calculado para esta propiedad. Aparecerá en la próxima
        corrida del pipeline.
      </section>
    );
  }

  return (
    <section className="rounded-lg border bg-card p-5 sm:p-6 space-y-5">
      <div className="flex flex-col items-center">
        <QualityScoreRing score={breakdown.score} />
      </div>
      <SubScoresList breakdown={breakdown} />
      <ScoreBreakdownSheet breakdown={breakdown} />
    </section>
  );
}
