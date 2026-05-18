import { MapPin } from "lucide-react";
import { PropertyMap } from "./PropertyMap";

/**
 * Server-side wrapper for the map block: heading + address + the actual map.
 * Keeps the public page lean — one import per section.
 */

interface PropertyMapSectionProps {
  lat: number | null;
  lng: number | null;
  address: string | null;
  partido: string | null;
  arbaGeoJson: unknown | null;
}

export function PropertyMapSection({
  lat,
  lng,
  address,
  partido,
  arbaGeoJson,
}: PropertyMapSectionProps) {
  return (
    <section className="rounded-lg border bg-card overflow-hidden">
      <header className="px-5 sm:px-6 py-4 border-b">
        <h2 className="font-semibold text-base">Ubicación</h2>
        {address && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <MapPin className="size-3.5" />
            <span>
              {address}
              {partido && <span>, {partido}</span>}
            </span>
          </p>
        )}
      </header>
      <div className="p-5 sm:p-6">
        <PropertyMap
          lat={lat}
          lng={lng}
          address={address}
          arbaGeoJson={arbaGeoJson}
        />
        {arbaGeoJson != null && (
          <p className="text-[0.7rem] text-muted-foreground mt-2 text-center">
            Polígono navy: parcela registrada en ARBA · Pin: ubicación geocodificada
          </p>
        )}
      </div>
    </section>
  );
}
