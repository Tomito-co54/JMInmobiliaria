"use client";

import { useState } from "react";
import { Crosshair, SquareDashedMousePointer, X } from "lucide-react";
import { AreaMap, type AreaMapPoint } from "@/components/map/AreaMap";
import { getMatchBand } from "@/lib/matching/bands";
import { formatPrice } from "@/lib/property/price";
import { isInside, type Bounds } from "@/lib/market/geo";
import type { ScoredProperty, CatalogProperty } from "@/lib/catalog/filters";
import { cn } from "@/lib/utils";

/**
 * The catalog on a map, with an area you can search in.
 *
 * Two ways to pick the area, because a phone and a desk do not share a
 * gesture. On a desk, "Seleccionar área" turns a drag into a rectangle, the
 * way the market map does. On a phone a drag is how you move the map, so
 * the area is the map itself: pan and zoom until it frames what you want
 * and press "Buscar en esta zona" — which is what the maps app does.
 *
 * The pins are the listings that survive the OTHER filters; the ones outside
 * the chosen area stay on the map, dimmed, so the visitor can see what they
 * are leaving out. With a match in hand the pins take its band colour, the
 * same colour as the number on the card.
 *
 * Leaflet arrives only when this renders: AreaMap dynamic-imports it, so the
 * catalog page pays the ~45 kB only for a visitor who opened the map.
 */
export function CatalogMap({
  items,
  selection,
  onSelectionChange,
  onPointClick,
}: {
  /** Listings after the text and selector filters, with their match score. */
  items: ScoredProperty<CatalogProperty>[];
  selection: Bounds | null;
  onSelectionChange: (bounds: Bounds | null) => void;
  onPointClick: (id: string) => void;
}) {
  const [selecting, setSelecting] = useState(false);
  const [view, setView] = useState<Bounds | null>(null);

  const points: AreaMapPoint[] = items.flatMap(({ property: p, score }) => {
    if (typeof p.lat !== "number" || typeof p.lng !== "number") return [];
    const price = formatPrice(p.price_amount, p.price_currency, p.operation_type, { period: true, compact: true });
    return [
      {
        id: p.id,
        lat: p.lat,
        lng: p.lng,
        color: score === null ? "var(--brand-navy)" : score >= 100 ? "var(--match-perfect)" : getMatchBand(score).hex,
        label: [p.address, price].filter(Boolean).join(" · "),
        active: selection ? isInside({ lat: p.lat, lng: p.lng }, selection) : true,
      },
    ];
  });

  const inArea = selection ? points.filter((p) => p.active).length : points.length;
  // A map that has not been laid out yet (a hidden tab, a collapsed panel)
  // reports a rectangle with no width. Searching in it would empty the list
  // for no reason the visitor can see.
  const viewUsable = view !== null && view.east > view.west && view.north > view.south;

  return (
    <div className="space-y-3">
      <div className="h-[22rem] sm:h-[28rem] overflow-hidden rounded-3xl border">
        <AreaMap
          points={points}
          selection={selection}
          onSelectionChange={(b) => {
            onSelectionChange(b);
            setSelecting(false);
          }}
          selecting={selecting}
          onPointClick={onPointClick}
          onViewChange={setView}
          emptyMessage="Ninguna de estas propiedades tiene ubicación en el mapa"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* The phone's way, first: it needs no mode and no precision. */}
        <button
          type="button"
          onClick={() => viewUsable && onSelectionChange(view)}
          disabled={!viewUsable}
          className={cn(
            "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
            "border-transparent bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50",
          )}
        >
          <Crosshair className="size-4" aria-hidden />
          Buscar en esta zona
        </button>

        {/* The desk's way: hidden where there is no mouse to drag with. */}
        <button
          type="button"
          aria-pressed={selecting}
          onClick={() => setSelecting((v) => !v)}
          className={cn(
            "hidden sm:inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
            selecting
              ? "border-transparent bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground hover:border-primary/40",
          )}
        >
          <SquareDashedMousePointer className="size-4" aria-hidden />
          {selecting ? "Arrastrá sobre el mapa" : "Dibujar un área"}
        </button>

        {selection && (
          <button
            type="button"
            onClick={() => {
              onSelectionChange(null);
              setSelecting(false);
            }}
            className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-medium text-foreground hover:bg-muted"
          >
            <X className="size-4" aria-hidden />
            Quitar el área
          </button>
        )}

        <p className="ml-auto text-sm text-muted-foreground" aria-live="polite">
          {selection
            ? `${inArea} ${inArea === 1 ? "propiedad" : "propiedades"} en el área`
            : `${points.length} en el mapa`}
        </p>
      </div>
    </div>
  );
}
