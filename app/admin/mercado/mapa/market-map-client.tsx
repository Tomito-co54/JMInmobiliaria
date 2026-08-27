"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SquareDashedMousePointer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AreaMap, type AreaMapPoint } from "@/components/map/AreaMap";
import {
  isInside,
  summarizeArea,
  type Bounds,
} from "@/lib/market/geo";
import { usdPerM2, type MarketRow } from "@/lib/market/stats";
import { describePriceVsMarket } from "@/lib/market/listing-bands";

/**
 * Market map: every geolocated scraped listing, coloured by how its price per
 * m² compares to the median for its own type, with a rectangle you can draw
 * to read one area on its own.
 *
 * The colour scale is imported rather than redefined so a listing that reads
 * red in the properties table cannot read green here. Same for usdPerM2 —
 * one definition, or the map and the dashboard would quietly disagree.
 */

/** Matches the bands in listing-bands.ts, as fills rather than text colours. */
const FILL = {
  expensive: "#DC2626",
  typical: "#64748B",
  cheap: "#16A34A",
  unknown: "#CBD5E1",
} as const;

function fillFor(row: MarketRow, medianForType: number | null): string {
  const v = usdPerM2(row);
  if (v === null || medianForType === null) return FILL.unknown;
  const band = describePriceVsMarket(v, medianForType);
  if (band.className.includes("red")) return FILL.expensive;
  if (band.className.includes("emerald")) return FILL.cheap;
  return FILL.typical;
}

function fmtInt(n: number | null): string {
  if (n === null) return "—";
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);
}

export function MarketMapClient({
  rows,
  medians,
}: {
  rows: MarketRow[];
  medians: Record<string, number>;
}) {
  const router = useRouter();
  const [selection, setSelection] = useState<Bounds | null>(null);
  const [selecting, setSelecting] = useState(false);

  const located = useMemo(
    () => rows.filter((r) => r.lat !== null && r.lng !== null),
    [rows],
  );

  const points: AreaMapPoint[] = useMemo(
    () =>
      located.map((r) => {
        const perM2 = usdPerM2(r);
        return {
          id: r.id,
          lat: Number(r.lat),
          lng: Number(r.lng),
          color: fillFor(r, medians[r.property_type ?? "(sin tipo)"] ?? null),
          active: r.is_active,
          label: `${r.address ?? "(sin dirección)"}${
            perM2 !== null ? ` · ${fmtInt(Math.round(perM2))} USD/m²` : ""
          }`,
        };
      }),
    [located, medians],
  );

  // No selection means the whole map is the selection. Reading the summary of
  // everything is a sane resting state — the panel is never blank.
  const inArea = useMemo(() => {
    if (!selection) return located;
    return located.filter((r) =>
      isInside({ lat: Number(r.lat), lng: Number(r.lng) }, selection),
    );
  }, [located, selection]);

  const summary = useMemo(() => summarizeArea(inArea), [inArea]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={selecting ? "default" : "outline"}
          onClick={() => setSelecting((v) => !v)}
        >
          <SquareDashedMousePointer className="size-4" />
          {selecting ? "Arrastrá sobre el mapa" : "Seleccionar área"}
        </Button>
        {selection && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSelection(null);
              setSelecting(false);
            }}
          >
            <X className="size-4" />
            Limpiar selección
          </Button>
        )}
        <p className="text-sm text-muted-foreground ml-auto">
          {selection
            ? `${summary.count} de ${located.length} avisos en el área`
            : `${located.length} avisos geolocalizados`}
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_18rem] gap-4">
        <div className="h-[32rem] rounded-lg border overflow-hidden">
          <AreaMap
            points={points}
            selection={selection}
            onSelectionChange={(b) => {
              setSelection(b);
              setSelecting(false);
            }}
            selecting={selecting}
            onPointClick={(id) => router.push(`/admin/properties/${id}`)}
          />
        </div>

        <aside className="space-y-3">
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <h2 className="text-sm font-medium">
              {selection ? "El área seleccionada" : "Todo el mapa"}
            </h2>

            <Stat
              label="USD/m² mediano"
              value={fmtInt(summary.medianUsdPerM2 === null ? null : Math.round(summary.medianUsdPerM2))}
              hint={`sobre ${summary.pricedCount} ${summary.pricedCount === 1 ? "aviso con precio y superficie" : "avisos con precio y superficie"}`}
              big
            />
            <Stat
              label="Días en mercado (mediana)"
              value={summary.medianDaysOnMarket === null ? "—" : String(summary.medianDaysOnMarket)}
            />
            <Stat
              label="Avisos"
              value={String(summary.count)}
              hint={`${summary.activeCount} activos · ${summary.count - summary.activeCount} dados de baja`}
            />
            <Stat
              label="Rango de precio (USD)"
              value={
                summary.minPrice === null
                  ? "—"
                  : `${fmtInt(summary.minPrice)} – ${fmtInt(summary.maxPrice)}`
              }
            />
          </div>

          <div className="rounded-lg border bg-card p-4 space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground">
              Color del punto
            </h3>
            <Legend color={FILL.cheap} label="Más de 25% bajo la mediana de su tipo" />
            <Legend color={FILL.typical} label="Cerca de la mediana" />
            <Legend color={FILL.expensive} label="Más de 25% sobre la mediana" />
            <Legend color={FILL.unknown} label="Sin USD/m² calculable" />
            <p className="text-[0.7rem] text-muted-foreground pt-1">
              Los puntos apagados son avisos que ya salieron del mercado. Quedan
              porque siguen diciendo a cuánto se pedía en esa cuadra.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  big,
}: {
  label: string;
  value: string;
  hint?: string;
  big?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`tabular-nums font-semibold ${big ? "text-2xl" : "text-base"}`}>
        {value}
      </p>
      {hint && <p className="text-[0.7rem] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <p className="flex items-center gap-2 text-xs text-muted-foreground">
      <span
        className="size-2.5 rounded-full shrink-0 border border-background"
        style={{ backgroundColor: color }}
      />
      {label}
    </p>
  );
}
