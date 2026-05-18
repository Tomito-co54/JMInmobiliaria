"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";

/**
 * Map section for the property page.
 *
 *   <PropertyMap lat={...} lng={...} arbaGeoJson={...} />
 *
 * Leaflet is fully client-side — we dynamic-import the inner map with
 * `ssr: false` so server rendering doesn't blow up on missing `window`.
 *
 * The "no coords" path is the empty state: 47/54 properties in our base
 * are geocoded, the rest fall back to a friendly placeholder.
 */

const PropertyMapInner = dynamic(() => import("./PropertyMap.inner"), {
  ssr: false,
  loading: () => (
    <div className="h-72 w-full rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-sm">
      Cargando mapa…
    </div>
  ),
});

interface PropertyMapProps {
  lat: number | null;
  lng: number | null;
  address: string | null;
  /** GeoJSON FeatureCollection from arba_lookups.raw_response (optional). */
  arbaGeoJson: unknown | null;
}

export function PropertyMap({ lat, lng, address, arbaGeoJson }: PropertyMapProps) {
  if (lat === null || lng === null) {
    return (
      <div className="h-44 w-full rounded-lg bg-muted flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
        <MapPin className="size-6" />
        <span>Sin ubicación verificada</span>
      </div>
    );
  }

  return (
    <PropertyMapInner
      lat={lat}
      lng={lng}
      address={address}
      arbaGeoJson={arbaGeoJson}
    />
  );
}
