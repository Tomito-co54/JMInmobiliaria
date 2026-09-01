"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, GeoJSON } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { BASEMAP_URL, BASEMAP_ATTRIBUTION } from "@/lib/map/tiles";

/**
 * The actual Leaflet map. Loaded only on the client (no SSR) via the parent
 * dynamic import — Leaflet touches `window` at module load and crashes
 * server-side, so this is the only safe pattern.
 *
 * Marker icon fix: webpack bundlers don't resolve Leaflet's default icon
 * URLs. We point them at our own copies here, once per module load.
 *
 * They used to come from unpkg. Three images of 4.5 kB total, and for them
 * the browser opened a connection to a host it contacted for nothing else —
 * DNS, TCP and TLS to a third party, on the page that has to load fastest.
 * They are also outside our control: if unpkg is slow, blocked or down, the
 * map loses its pin, and every visitor's IP is handed to a CDN that has no
 * business in this transaction.
 */

// Patch the default icon (idempotent across HMR).
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: () => string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
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
      {/* Same source as every other map in the app, so a provider swap
          is one env var and not a hunt through three components. Leaflet is
          fine with a template that has no {s} subdomain placeholder. */}
      <TileLayer attribution={BASEMAP_ATTRIBUTION} url={BASEMAP_URL} />
      {geoJson && <GeoJSON data={geoJson} style={() => PARCEL_STYLE} />}
      <Marker position={[lat, lng]} title={address ?? undefined} />
    </MapContainer>
  );
}
