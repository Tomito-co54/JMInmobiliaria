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
    <div className="space-y-3">
      {address && (
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <MapPin className="size-4" />
          <span>
            {address}
            {partido && <span>, {partido}</span>}
          </span>
        </p>
      )}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="p-3 sm:p-4">
          <PropertyMap
            lat={lat}
            lng={lng}
            address={address}
            arbaGeoJson={arbaGeoJson}
          />
        </div>
      </div>
      {arbaGeoJson != null && (
        <p className="text-[0.7rem] text-muted-foreground text-center">
          Polígono navy: la parcela registrada · Pin: ubicación de la propiedad
        </p>
      )}
    </div>
  );
}
