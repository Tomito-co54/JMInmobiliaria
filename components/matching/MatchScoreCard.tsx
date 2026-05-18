"use client";

import { Check, X, AlertTriangle, ChevronRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getMatchBand,
  interpolateMatchRingColor,
  type MatchBreakdown,
  type MatchSubScoreId,
} from "@/lib/matching";
import { cn } from "@/lib/utils";

/**
 * The buyer-facing match score block on the property page.
 *
 *   Match 87 — Buen match para vos
 *   [Ver detalle →]
 *
 * Tapping "Ver detalle" opens a sheet with each sub-score and a verdict
 * icon (✅ cumple / ⚠️ parcial / ❌ no cumple).
 *
 * The component is rendered server-side from /p/[id]; the sheet trigger
 * is the only interactive part, which is why this whole component is
 * "use client" (state for sheet open/close).
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

interface MatchScoreCardProps {
  breakdown: MatchBreakdown;
  /** The profile that produced this match. Surfaces in the sheet header. */
  profileName: string;
}

export function MatchScoreCard({ breakdown, profileName }: MatchScoreCardProps) {
  const band = getMatchBand(breakdown.score);
  const color = interpolateMatchRingColor(breakdown.score);
  const hasScore = breakdown.score !== null;

  return (
    <Sheet>
      <section
        className="rounded-lg border bg-card p-5 sm:p-6 space-y-3"
        style={{
          borderLeftWidth: 4,
          borderLeftColor: hasScore ? color : undefined,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Match para tu búsqueda
            </p>
            <div className="mt-1 flex items-baseline gap-2 flex-wrap">
              <span
                className="text-3xl sm:text-4xl font-extrabold tabular-nums"
                style={{ color: hasScore ? color : undefined }}
              >
                {breakdown.score ?? "—"}
              </span>
              <Badge
                variant="secondary"
                className="text-xs"
                style={{
                  backgroundColor: `${band.hex}1A`,
                  color: band.hex,
                  borderColor: `${band.hex}33`,
                }}
              >
                {band.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Según tu búsqueda &quot;{profileName}&quot;
            </p>
          </div>
        </div>

        <SheetTrigger
          render={
            <Button variant="outline" size="sm" className="w-full justify-between">
              <span>Ver por qué este match</span>
              <ChevronRight className="size-4" />
            </Button>
          }
        />
      </section>

      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-baseline gap-3">
            <span
              className="text-4xl font-extrabold tabular-nums"
              style={{ color: hasScore ? color : undefined }}
            >
              {breakdown.score ?? "—"}
            </span>
            <span style={{ color: hasScore ? color : undefined }}>{band.label}</span>
          </SheetTitle>
          <SheetDescription>
            Cómo se compone el match contra tu búsqueda &quot;{profileName}&quot;.
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
                    <visual.Icon className={cn("size-4", visual.color)} aria-hidden />
                    <h3 className="font-semibold text-sm">{SUBSCORE_LABELS[id]}</h3>
                  </div>
                  <span
                    className="text-base font-bold tabular-nums"
                    style={{
                      color:
                        sub.confidence === 0 ? undefined : interpolateMatchRingColor(sub.value),
                    }}
                  >
                    {sub.confidence === 0 ? "—" : Math.round(sub.value)}
                  </span>
                </header>
                <p className="text-xs text-muted-foreground leading-relaxed">{sub.reason}</p>
              </section>
            );
          })}
        </div>

        <footer className="border-t mt-4 px-4 py-3 text-[0.7rem] text-muted-foreground/80 leading-relaxed">
          Algoritmo {breakdown.algorithm_version} · Calculado al cargar esta página
        </footer>
      </SheetContent>
    </Sheet>
  );
}
