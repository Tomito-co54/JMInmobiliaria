import { BedDouble, Bath, Maximize2, MapPin, Car } from "lucide-react";

/**
 * Price + the basic meta strip below it (tipo · m² · ambientes · ubicación).
 *
 * Mobile-first: stacks the price on top, with a chip row below for the
 * meta. The chip row uses lucide icons so each fact is scannable in a
 * single tap-length glance.
 */

interface PropertyPriceBlockProps {
  priceAmount: number | null;
  priceCurrency: "USD" | "ARS" | null;
  propertyType: string | null;
  operationType: string | null;
  partido: string | null;
  address: string | null;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  garages: number | null;
  surfaceTotal: number | null;
  surfaceArba: number | null;
}

const TYPE_LABELS: Record<string, string> = {
  casa: "Casa",
  departamento: "Departamento",
  ph: "PH",
  lote: "Lote",
  local: "Local",
};

const OPERATION_LABELS: Record<string, string> = {
  venta: "en venta",
  alquiler: "en alquiler",
};

function fmtPrice(amount: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(amount);
}

export function PropertyPriceBlock({
  priceAmount,
  priceCurrency,
  propertyType,
  operationType,
  partido,
  address,
  rooms,
  bedrooms,
  bathrooms,
  garages,
  surfaceTotal,
  surfaceArba,
}: PropertyPriceBlockProps) {
  const typeLabel = propertyType ? (TYPE_LABELS[propertyType] ?? propertyType) : "Propiedad";
  const opLabel = operationType ? (OPERATION_LABELS[operationType] ?? operationType) : null;
  // Prefer ARBA-verified surface if both are present — that's the diferenciador.
  const surface = surfaceArba ?? surfaceTotal;

  return (
    <section className="space-y-3">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {typeLabel} {opLabel}
        </p>
        {priceAmount !== null && priceCurrency ? (
          <p className="text-3xl sm:text-4xl font-bold tracking-tight tabular-nums mt-1">
            {priceCurrency}{" "}
            <span className="font-extrabold">{fmtPrice(priceAmount)}</span>
          </p>
        ) : (
          <p className="text-2xl font-bold text-muted-foreground mt-1">
            Consultar precio
          </p>
        )}
      </div>

      {address && (
        <p className="text-sm text-foreground/85 flex items-start gap-1.5">
          <MapPin className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
          <span>
            {address}
            {partido && <span className="text-muted-foreground">, {partido}</span>}
          </span>
        </p>
      )}

      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
        {rooms !== null && (
          <li className="flex items-center gap-1.5">
            <span className="font-semibold tabular-nums">{rooms}</span>
            <span className="text-muted-foreground">amb</span>
          </li>
        )}
        {bedrooms !== null && (
          <li className="flex items-center gap-1.5 text-muted-foreground">
            <BedDouble className="size-4" />
            <span>
              <span className="font-semibold text-foreground tabular-nums">{bedrooms}</span> dorm
            </span>
          </li>
        )}
        {bathrooms !== null && (
          <li className="flex items-center gap-1.5 text-muted-foreground">
            <Bath className="size-4" />
            <span>
              <span className="font-semibold text-foreground tabular-nums">{bathrooms}</span> baño{bathrooms === 1 ? "" : "s"}
            </span>
          </li>
        )}
        {garages !== null && garages > 0 && (
          <li className="flex items-center gap-1.5 text-muted-foreground">
            <Car className="size-4" />
            <span>
              <span className="font-semibold text-foreground tabular-nums">{garages}</span> cochera{garages === 1 ? "" : "s"}
            </span>
          </li>
        )}
        {surface !== null && (
          <li className="flex items-center gap-1.5 text-muted-foreground">
            <Maximize2 className="size-4" />
            <span>
              <span className="font-semibold text-foreground tabular-nums">{surface}</span> m²
            </span>
          </li>
        )}
      </ul>
    </section>
  );
}
