"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import type { Bounds } from "@/lib/market/geo";
import type { AreaMapPoint } from "./AreaMap.inner";

/**
 * A map of many properties with a rectangle you can draw over it.
 *
 * Deliberately knows nothing about market intelligence or about catalogues:
 * it takes points that already carry their own colour and label, and it
 * reports the rectangle someone drew. Both consumers — the admin market map
 * and, later, the public search — differ only in where the points come from
 * and what they do with the selection, so that is the seam.
 *
 * Leaflet is client-only and touches `window` at module load, so the real
 * map is dynamic-imported with `ssr: false`. Same pattern as PropertyMap.
 */

const AreaMapInner = dynamic(() => import("./AreaMap.inner"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-sm">
      Cargando mapa…
    </div>
  ),
});

export type { AreaMapPoint };

interface AreaMapProps {
  points: AreaMapPoint[];
  /** The committed rectangle, drawn as a solid outline. */
  selection: Bounds | null;
  onSelectionChange: (bounds: Bounds | null) => void;
  /** While true, dragging draws a rectangle instead of panning. */
  selecting: boolean;
  onPointClick?: (id: string) => void;
  /** Shown when there is nothing to plot. */
  emptyMessage?: string;
}

export function AreaMap({
  points,
  selection,
  onSelectionChange,
  selecting,
  onPointClick,
  emptyMessage = "Sin propiedades geolocalizadas para mostrar",
}: AreaMapProps) {
  if (points.length === 0) {
    return (
      <div className="h-full w-full rounded-lg bg-muted flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
        <MapPin className="size-6" />
        <span>{emptyMessage}</span>
      </div>
    );
  }

  return (
    <AreaMapInner
      points={points}
      selection={selection}
      onSelectionChange={onSelectionChange}
      selecting={selecting}
      onPointClick={onPointClick}
    />
  );
}
