import { BuildingCover } from "@/components/catalog/BuildingCover";
import { BuildingUnits } from "@/components/property/BuildingUnits";
import type { BuildingUnitRow } from "@/lib/db/properties";
import { formatPrice } from "@/lib/property/price";

/**
 * One building and the units published in it.
 *
 * A heading with its units underneath, not a card in a grid (§6 blacklist).
 * The grouping is the parcel's — see lib/buildings — so this is a rendering
 * of a cadastral fact rather than a curation: four listings at Belgrano 1287
 * are in one building because the cadastre says one parcel, not because
 * someone typed the same street twice.
 *
 * The unit rows are the same component the property page uses for "otras
 * unidades en este edificio". Same relation, same presentation (§2.5): a
 * visitor who meets a building here and then opens a unit sees the siblings
 * laid out the way they already learned to read.
 */

export interface BuildingGroupData {
  key: string;
  label: string;
  partido: string | null;
  units: BuildingUnitRow[];
  fromPrice: number | null;
  fromCurrency: "USD" | "ARS" | null;
  fromOperation: "venta" | "alquiler" | null;
  surfaceMin: number | null;
  surfaceMax: number | null;
  /**
   * The building's icon. Taken from its own units rather than uploaded
   * separately: a building has no record of its own (lib/buildings is all
   * derived), so there is nowhere to attach a photo to, and the first unit's
   * cover is a photo of this building by definition. Falls back to the
   * Building2 glyph when no unit has one.
   *
   * Rendered by BuildingCover, which opens it full-size: at thumbnail size
   * this photo can only confirm a building you already recognise.
   */
  coverPhoto: string | null;
}

function surfaceLine(min: number | null, max: number | null): string | null {
  if (min === null) return null;
  // One number when every unit is the same size — "40 a 40 m²" reads like a
  // template that forgot to collapse.
  if (max === null || max === min) return `${min} m²`;
  return `${min} a ${max} m²`;
}

export function BuildingGroup({ building }: { building: BuildingGroupData }) {
  const facts = [
    `${building.units.length} ${
      building.units.length === 1 ? "unidad publicada" : "unidades publicadas"
    }`,
    formatPrice(building.fromPrice, building.fromCurrency, building.fromOperation, {
      compact: true,
      period: true,
    })
      ? `desde ${formatPrice(building.fromPrice, building.fromCurrency, building.fromOperation, { compact: true, period: true })}`
      : null,
    surfaceLine(building.surfaceMin, building.surfaceMax),
  ].filter((f): f is string => f !== null);

  return (
    <section className="rounded-3xl border bg-card p-5 sm:p-7">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-4">
          <BuildingCover photo={building.coverPhoto} label={building.label} />

          <div className="min-w-0">
            <p
              className="text-[0.7rem] uppercase tracking-[0.2em] font-medium"
              style={{ color: "var(--brand-gold)" }}
            >
              Edificio
            </p>
            <h2
              className="mt-1 font-heading font-medium text-2xl sm:text-3xl tracking-tight"
              style={{ color: "var(--brand-heading)" }}
            >
              {building.label}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {facts.join(" · ")}
            </p>
          </div>
        </div>
        {building.partido && (
          <p className="text-sm text-muted-foreground">{building.partido}</p>
        )}
      </header>

      <div className="mt-6">
        <BuildingUnits units={building.units} />
      </div>
    </section>
  );
}
