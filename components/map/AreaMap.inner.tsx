"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Rectangle,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { LeafletMouseEvent } from "leaflet";
import "leaflet/dist/leaflet.css";
import { BASEMAP_URL, BASEMAP_ATTRIBUTION } from "@/lib/map/tiles";
import {
  boundsFromCorners,
  boundsDiagonalMeters,
  boundsOfPoints,
  robustBoundsOfPoints,
  type Bounds,
  type LatLng,
} from "@/lib/market/geo";

/**
 * The Leaflet half of AreaMap. Client-only — Leaflet reaches for `window` at
 * module load — and reached exclusively through the parent's dynamic import.
 *
 * Circles rather than Leaflet's default markers, for two reasons. They take
 * a fill colour, which is the whole point of plotting price on a map; and the
 * default marker is a PNG fetched from a CDN, which at three hundred pins
 * would be three hundred requests to draw what vector circles draw for free.
 */

export interface AreaMapPoint {
  id: string;
  lat: number;
  lng: number;
  /** Fill colour. Callers decide what it encodes. */
  color: string;
  /** Shown on hover. */
  label: string;
  /** Dimmed when false — used for listings already off the market. */
  active?: boolean;
}

interface AreaMapInnerProps {
  points: AreaMapPoint[];
  selection: Bounds | null;
  onSelectionChange: (bounds: Bounds | null) => void;
  selecting: boolean;
  onPointClick?: (id: string) => void;
  onViewChange?: (bounds: Bounds) => void;
}

/** Zona Sur, for the case where there is nothing to frame. */
const FALLBACK_CENTER: [number, number] = [-34.7606, -58.3975];
const FALLBACK_ZOOM = 13;

/** Below this, a drag was a click that wobbled. */
const MIN_DRAG_METERS = 40;

function toBoundsArray(b: Bounds): [[number, number], [number, number]] {
  return [
    [b.south, b.west],
    [b.north, b.east],
  ];
}

/** Frames the points once, on first load. */
function FitToPoints({ points }: { points: AreaMapPoint[] }) {
  const map = useMap();
  const done = useRef(false);

  useEffect(() => {
    if (done.current || points.length === 0) return;
    // Robust bounds, so three listings in another partido don't decide the
    // opening zoom for the three hundred that are together.
    const b = robustBoundsOfPoints(points);
    if (!b) return;
    done.current = true;
    // A single point has no extent to fit, so frame it at street level
    // instead of letting Leaflet zoom to its maximum.
    if (b.north === b.south && b.east === b.west) {
      map.setView([b.north, b.east], 16);
      return;
    }
    map.fitBounds(toBoundsArray(b), { padding: [24, 24] });
  }, [map, points]);

  return null;
}

/**
 * Reports what the map shows, after the opening fit and after every move.
 * `moveend` also fires for the fit and for zooms, so one event covers all.
 */
function ViewReporter({ onViewChange }: { onViewChange: (b: Bounds) => void }) {
  const map = useMap();
  const report = () => {
    const b = map.getBounds();
    onViewChange({ north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() });
  };
  useMapEvents({ moveend: report });
  useEffect(() => {
    report();
    // Once, on mount: later changes arrive through moveend.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/**
 * Rectangle drawing.
 *
 * Leaflet has no built-in for this and the usual answer is leaflet-draw,
 * a dependency with its own toolbar and stylesheet for what is, here,
 * "remember where the drag started". Dragging the map is disabled while
 * selecting so the gesture isn't fighting the pan.
 */
function SelectionLayer({
  selecting,
  onSelectionChange,
}: {
  selecting: boolean;
  onSelectionChange: (b: Bounds | null) => void;
}) {
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [live, setLive] = useState<Bounds | null>(null);
  const map = useMap();

  useEffect(() => {
    if (selecting) {
      map.dragging.disable();
      map.getContainer().style.cursor = "crosshair";
    } else {
      map.dragging.enable();
      map.getContainer().style.cursor = "";
      setOrigin(null);
      setLive(null);
    }
    return () => {
      map.dragging.enable();
      map.getContainer().style.cursor = "";
    };
  }, [selecting, map]);

  useMapEvents({
    mousedown(e: LeafletMouseEvent) {
      if (!selecting) return;
      setOrigin({ lat: e.latlng.lat, lng: e.latlng.lng });
      setLive(null);
    },
    mousemove(e: LeafletMouseEvent) {
      if (!selecting || !origin) return;
      setLive(boundsFromCorners(origin, { lat: e.latlng.lat, lng: e.latlng.lng }));
    },
    mouseup(e: LeafletMouseEvent) {
      if (!selecting || !origin) return;
      const b = boundsFromCorners(origin, { lat: e.latlng.lat, lng: e.latlng.lng });
      setOrigin(null);
      setLive(null);
      // A plain click reads as a zero-size rectangle. Treating it as a
      // selection would blank the panel every time someone taps the map.
      onSelectionChange(boundsDiagonalMeters(b) < MIN_DRAG_METERS ? null : b);
    },
  });

  if (!live) return null;
  return (
    <Rectangle
      bounds={toBoundsArray(live)}
      pathOptions={{ color: "#1A1B5C", weight: 1.5, dashArray: "4 4", fillOpacity: 0.06 }}
    />
  );
}

export default function AreaMapInner({
  points,
  selection,
  onSelectionChange,
  selecting,
  onPointClick,
  onViewChange,
}: AreaMapInnerProps) {
  const center = useMemo<[number, number]>(() => {
    const b = boundsOfPoints(points);
    if (!b) return FALLBACK_CENTER;
    return [(b.north + b.south) / 2, (b.east + b.west) / 2];
  }, [points]);

  return (
    <MapContainer
      center={center}
      zoom={FALLBACK_ZOOM}
      scrollWheelZoom
      className="h-full w-full rounded-lg z-0"
    >
      {/* Same source as every other map in the app, so a provider swap
          is one env var and not a hunt through three components. Leaflet is
          fine with a template that has no {s} subdomain placeholder. */}
      <TileLayer attribution={BASEMAP_ATTRIBUTION} url={BASEMAP_URL} />

      <FitToPoints points={points} />
      {onViewChange && <ViewReporter onViewChange={onViewChange} />}
      <SelectionLayer selecting={selecting} onSelectionChange={onSelectionChange} />

      {selection && (
        <Rectangle
          bounds={toBoundsArray(selection)}
          pathOptions={{ color: "#1A1B5C", weight: 2, fillOpacity: 0.05 }}
        />
      )}

      {points.map((p) => (
        <CircleMarker
          key={p.id}
          center={[p.lat, p.lng]}
          radius={5}
          pathOptions={{
            color: "#ffffff",
            weight: 1,
            fillColor: p.color,
            // Delisted listings stay on the map but recede: they are context
            // for what the area was asking, not what is on offer today.
            fillOpacity: p.active === false ? 0.35 : 0.9,
          }}
          eventHandlers={
            onPointClick ? { click: () => onPointClick(p.id) } : undefined
          }
        >
          <Tooltip direction="top" offset={[0, -4]}>
            {p.label}
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
