import Image from "next/image";
import { Building2 } from "lucide-react";
import { BuildingUnits } from "@/components/property/BuildingUnits";
import type { BuildingUnitRow } from "@/lib/db/properties";

/**
 * One building and the units published in it.
 *
 * A heading with its units underneath, not a card in a grid (§6 blacklist).
 * The grouping is the parcel's — see lib/buildings — so this is a rendering
 * of a fact from ARBA rather than a curation: four listings at Belgrano 1287
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
  surfaceMin: number | null;
  surfaceMax: number | null;
  /**
   * The building's icon. Taken from its own units rather than uploaded
   * separately: a building has no record of its own (lib/buildings is all
   * derived), so there is nowhere to attach a photo to, and the first unit's
   * cover is a photo of this building by definition. Falls back to the
   * Building2 glyph when no unit has one.
   */
  coverPhoto: string | null;
}

function fmtPrice(amount: number, currency: string): string {
  const n = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(
    amount,
  );
  return currency === "USD" ? `USD ${n}` : `$ ${n}`;
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
    building.fromPrice !== null && building.fromCurrency
      ? `desde ${fmtPrice(building.fromPrice, building.fromCurrency)}`
      : null,
    surfaceLine(building.surfaceMin, building.surfaceMax),
  ].filter((f): f is string => f !== null);

  return (
    <section className="rounded-3xl border bg-card p-5 sm:p-7">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-4">
          <div
            className="relative size-14 sm:size-16 shrink-0 overflow-hidden rounded-2xl bg-muted"
            aria-hidden
          >
            {building.coverPhoto ? (
              <Image
                src={building.coverPhoto}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
              />
            ) : (
              <span className="flex size-full items-center justify-center">
                <Building2
                  className="size-6 text-muted-foreground"
                  aria-hidden
                />
              </span>
            )}
          </div>

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
