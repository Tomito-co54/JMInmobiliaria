"use client";

import { Check, X, AlertTriangle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  getMatchBand,
  interpolateMatchRingColor,
  type MatchBreakdown,
  type MatchSubScoreId,
} from "@/lib/matching";
import { cn } from "@/lib/utils";

/**
 * Why the match is what it is — one sub-score at a time, each with a verdict.
 *
 * Split out of the old `MatchScoreCard` so the breakdown can sit under any
 * presentation of the number. That card owned both the headline and the
 * explanation, which meant showing the match anywhere else duplicated the
 * score. The scoring module already draws this line (`QualityScoreCard` vs
 * `ScoreBreakdownSheet`); this brings matching in line with it.
 *
 * The caller supplies the trigger, because what opens the sheet is a property
 * of the surface, not of the breakdown.
 */

const SUBSCORE_LABELS: Record<MatchSubScoreId, string> = {
  zone: "Zona",
  price: "Precio",
  type: "Tipo de propiedad",
  operation: "Operación",
  rooms: "Ambientes",
  surface: "Superficie",
  must_haves: "No-negociables",
};

const SUBSCORE_ORDER: MatchSubScoreId[] = [
  "zone",
  "price",
  "type",
  "operation",
  "rooms",
  "surface",
  "must_haves",
];

const VERDICT_ICON = {
  fulfilled: { Icon: Check, color: "text-emerald-600" },
  partial: { Icon: AlertTriangle, color: "text-amber-600" },
  unfulfilled: { Icon: X, color: "text-red-600" },
} as const;

export function MatchBreakdownSheet({
  breakdown,
  trigger,
}: {
  breakdown: MatchBreakdown;
  trigger: React.ReactElement;
}) {
  const band = getMatchBand(breakdown.score);
  const color = interpolateMatchRingColor(breakdown.score);
  const hasScore = breakdown.score !== null;

  return (
    <Sheet>
      <SheetTrigger render={trigger} />

      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-baseline gap-3">
            <span
              className="text-4xl font-extrabold tabular-nums"
              style={{ color: hasScore ? color : undefined }}
            >
              {breakdown.score ?? "—"}
            </span>
            <span style={{ color: hasScore ? color : undefined }}>
              {band.label}
            </span>
          </SheetTitle>
          <SheetDescription>
            Cómo se compone el match contra lo que buscás. Los criterios que no
            respondiste no puntúan: el match se reparte entre los que sí.
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 py-2 space-y-4">
          {SUBSCORE_ORDER.map((id) => {
            const sub = breakdown.subscores[id];
            if (!sub) return null;
            const visual = VERDICT_ICON[sub.verdict];
            return (
              <section key={id} className="space-y-1.5">
                <header className="flex items-baseline justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <visual.Icon
                      className={cn("size-4", visual.color)}
                      aria-hidden
                    />
                    <h3 className="font-semibold text-sm">
                      {SUBSCORE_LABELS[id]}
                    </h3>
                  </div>
                  <span
                    className="text-base font-bold tabular-nums"
                    style={{
                      color:
                        sub.confidence === 0
                          ? undefined
                          : interpolateMatchRingColor(sub.value),
                    }}
                  >
                    {sub.confidence === 0 ? "—" : Math.round(sub.value)}
                  </span>
                </header>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {sub.reason}
                </p>
              </section>
            );
          })}
        </div>

        <footer className="border-t mt-4 px-4 py-3 text-[0.7rem] text-muted-foreground/80 leading-relaxed">
          Algoritmo {breakdown.algorithm_version} · Calculado en tu navegador,
          con lo que elegiste acá. No se guarda en ningún servidor.
        </footer>
      </SheetContent>
    </Sheet>
  );
}
