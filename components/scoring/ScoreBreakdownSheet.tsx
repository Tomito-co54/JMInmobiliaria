"use client";

import { Check, X, ChevronRight, Info } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { QualityBreakdown, SubScoreId } from "@/lib/scoring";
import { getScoreBand, interpolateRingColor } from "@/lib/scoring/bands";

/**
 * Detailed breakdown of the quality score, opened in a side sheet.
 *
 * Shared between the public property view and the admin inspector — same
 * data, slightly different framing. For now we render everything; if admin
 * needs raw JSON dumps later, we add a prop to toggle.
 */

const SUBSCORE_LABELS: Record<SubScoreId, string> = {
  documentation: "Documentación",
  price_vs_comparables: "Precio vs zona",
  listing_quality: "Calidad del aviso",
  time_on_market: "Tiempo en mercado",
  arba_coherence: "Coherencia ARBA",
};

const SUBSCORE_ORDER: SubScoreId[] = [
  "documentation",
  "price_vs_comparables",
  "arba_coherence",
  "listing_quality",
  "time_on_market",
];

interface ScoreBreakdownSheetProps {
  breakdown: QualityBreakdown;
}

interface DocComponent {
  id: string;
  label: string;
  weight: number;
  applies: boolean;
  present: boolean;
}

function isDocComponentArray(x: unknown): x is DocComponent[] {
  return (
    Array.isArray(x) &&
    x.every(
      (c) =>
        c &&
        typeof c === "object" &&
        typeof (c as DocComponent).id === "string" &&
        typeof (c as DocComponent).label === "string" &&
        typeof (c as DocComponent).present === "boolean" &&
        typeof (c as DocComponent).applies === "boolean",
    )
  );
}

export function ScoreBreakdownSheet({ breakdown }: ScoreBreakdownSheetProps) {
  const band = getScoreBand(breakdown.score);
  const scoreColor = interpolateRingColor(breakdown.score);

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="outline" size="sm" className="w-full justify-between">
            <span>Ver desglose completo</span>
            <ChevronRight className="size-4" />
          </Button>
        }
      />

      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-baseline gap-3">
            <span className="text-4xl font-extrabold tabular-nums" style={{ color: scoreColor }}>
              {breakdown.score ?? "—"}
            </span>
            <span style={{ color: scoreColor }}>{band.label}</span>
          </SheetTitle>
          <SheetDescription>
            Cómo se compone el score. Las barras y colores siguen la misma escala que el anillo.
          </SheetDescription>
        </SheetHeader>

        {breakdown.insufficient_data && (
          <div className="mx-4 my-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex gap-2">
            <Info className="size-4 shrink-0 mt-0.5" />
            <p>
              Datos insuficientes para calcular el score total. Mostramos los sub-scores que sí
              pudimos evaluar.
            </p>
          </div>
        )}

        <div className="px-4 py-2 space-y-5">
          {SUBSCORE_ORDER.map((id) => {
            const sub = breakdown.subscores[id];
            if (!sub) return null;
            const muted = sub.confidence === 0;
            const color = muted ? "#94A3B8" : interpolateRingColor(sub.value);
            return (
              <section key={id} className="space-y-2">
                <header className="flex items-baseline justify-between gap-2">
                  <h3 className="font-semibold text-sm">{SUBSCORE_LABELS[id]}</h3>
                  <span
                    className="text-xl font-bold tabular-nums"
                    style={{ color: muted ? undefined : color }}
                  >
                    {muted ? "—" : Math.round(sub.value)}
                  </span>
                </header>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden" aria-hidden>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${muted ? 0 : Math.max(2, sub.value)}%`, background: color }}
                  />
                </div>
                <p className="text-xs text-muted-foreground leading-snug">{sub.reason}</p>

                <p className="text-[0.7rem] text-muted-foreground/80 tabular-nums">
                  Peso: {sub.weight}/100 · Confianza:{" "}
                  {(sub.confidence * 100).toFixed(0)}%
                </p>

                {/* Documentation: render the component checklist */}
                {id === "documentation" &&
                  sub.details &&
                  isDocComponentArray(
                    (sub.details as { components?: unknown }).components,
                  ) && (
                    <ul className="mt-2 space-y-1 text-xs">
                      {(
                        (sub.details as { components: DocComponent[] }).components
                      )
                        .filter((c) => c.applies)
                        .map((c) => (
                          <li key={c.id} className="flex items-center gap-2">
                            {c.present ? (
                              <Check className="size-4 text-emerald-600" />
                            ) : (
                              <X className="size-4 text-muted-foreground/50" />
                            )}
                            <span
                              className={
                                c.present ? "" : "text-muted-foreground line-through"
                              }
                            >
                              {c.label}
                            </span>
                            <span className="ml-auto text-muted-foreground tabular-nums">
                              {c.weight}
                            </span>
                          </li>
                        ))}
                    </ul>
                  )}
              </section>
            );
          })}
        </div>

        <footer className="border-t mt-4 px-4 py-3 text-[0.7rem] text-muted-foreground/80 leading-relaxed">
          Algoritmo {breakdown.algorithm_version} · Calculado{" "}
          {new Date(breakdown.computed_at).toLocaleString("es-AR")} · Peso efectivo{" "}
          {(breakdown.effective_weight_ratio * 100).toFixed(0)}%
        </footer>
      </SheetContent>
    </Sheet>
  );
}
