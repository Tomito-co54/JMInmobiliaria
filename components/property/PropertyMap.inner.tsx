"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, GeoJSON } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * The actual Leaflet map. Loaded only on the client (no SSR) via the parent
 * dynamic import — Leaflet touches `window` at module load and crashes
 * server-side, so this is the only safe pattern.
 *
 * Marker icon fix: webpack bundlers don't resolve Leaflet's default icon
 * URLs. We point them at the official CDN here once per module load.
 */

// Patch the default icon (idempotent across HMR).
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: () => string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface MapInnerProps {
  lat: number;
  lng: number;
  address: string | null;
  /** GeoJSON FeatureCollection from arba_lookups.raw_response (optional). */
  arbaGeoJson: unknown | null;
}

const PARCEL_STYLE = {
  color: "#1A1B5C", // brand navy
  weight: 2,
  opacity: 0.85,
  fillColor: "#1A1B5C",
  fillOpacity: 0.12,
};

function looksLikeFeatureCollection(x: unknown): x is GeoJSON.FeatureCollection {
  return (
    !!x &&
    typeof x === "object" &&
    (x as { type?: string }).type === "FeatureCollection" &&
    Array.isArray((x as { features?: unknown[] }).features)
  );
}

export default function PropertyMapInner({
  lat,
  lng,
  address,
  arbaGeoJson,
}: MapInnerProps) {
  // Memoize so React-Leaflet's GeoJSON doesn't re-instantiate on every render.
  const geoJson = useMemo(
    () => (looksLikeFeatureCollection(arbaGeoJson) ? arbaGeoJson : null),
    [arbaGeoJson],
  );

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={17}
      scrollWheelZoom={false}
      className="h-72 w-full rounded-lg"
      attributionControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {geoJson && <GeoJSON data={geoJson} style={() => PARCEL_STYLE} />}
      <Marker position={[lat, lng]} title={address ?? undefined} />
    </MapContainer>
  );
}
