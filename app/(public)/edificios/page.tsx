import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PublicHeader } from "@/components/shared/PublicHeader";
import { Reveal } from "@/components/shared/Reveal";
import { WhatsAppFloat } from "@/components/home/WhatsAppFloat";
import {
  BuildingGroup,
  type BuildingGroupData,
} from "@/components/catalog/BuildingGroup";
import { buildingLabel, groupByBuilding } from "@/lib/buildings";
import { buildingPhoto } from "@/lib/buildings/photos";
import { getPropertiesByProximity, ZONA_SUR_CENTER } from "@/lib/db/properties";
import type { BuildingUnitRow } from "@/lib/db/properties";

/**
 * The catalog seen by building instead of by unit.
 *
 * Four listings at Belgrano 1287 are four rows in /propiedades and one
 * building here. That is the view someone comparing units within a building
 * actually wants — is there a cheaper one, one with a terrace, one on the
 * ground floor — and the flat catalog cannot express it without repeating the
 * address four times.
 *
 * Grouping comes from the cadastral parcel (lib/buildings), so it is the
 * cadastre saying these units share a building, not string matching on the
 * address.
 *
 * A parcel with a single published unit is a building too, and it is listed
 * as one. It carries less news than a building with four, so it sorts below
 * them — but leaving it out would mean this page shows a different catalog
 * than /propiedades, which is worse than a short entry.
 *
 * What genuinely cannot appear is a property whose parcel never resolved:
 * without a parcel there is nothing to group it by. Those are
 * counted at the foot of the page with a link to the full catalog, so the
 * page never passes for the whole of the inventory.
 */

export const metadata: Metadata = {
  title: "Edificios — Jotaeme",
  description:
    "Las unidades publicadas agrupadas por edificio, según la parcela catastral.",
};

type Row = BuildingUnitRow & {
  nomenclatura_catastral: string | null;
  partido: string | null;
};

function toGroup(key: string, units: Row[]): BuildingGroupData {
  const priced = units.filter(
    (u): u is Row & { price_amount: number; price_currency: "USD" | "ARS" } =>
      u.price_amount !== null && u.price_amount > 0 && !!u.price_currency,
  );
  // Only compare what is comparable — the cheapest within the cohort most
  // units share, the same rule summariseBuildings applies to the catalog
  // badge. Keep the two in step: they answer the same question for the same
  // reader on two different pages.
  //
  // The cohort is currency AND operation. A rent is the smallest number in a
  // mixed building by an order of magnitude, so without the operation the
  // "desde" of a building of USD 80.000 flats becomes the rent of the one
  // flat that is to let.
  const byCohort = new Map<string, number[]>();
  for (const u of priced) {
    const cohort = `${u.price_currency}·${u.operation_type ?? ""}`;
    const list = byCohort.get(cohort);
    if (list) list.push(u.price_amount);
    else byCohort.set(cohort, [u.price_amount]);
  }
  let fromPrice: number | null = null;
  let fromCurrency: "USD" | "ARS" | null = null;
  let fromOperation: "venta" | "alquiler" | null = null;
  let most = 0;
  for (const [cohort, prices] of byCohort) {
    if (prices.length > most) {
      most = prices.length;
      const [currency, operation] = cohort.split("·");
      fromCurrency = currency as "USD" | "ARS";
      fromOperation = operation === "" ? null : (operation as "venta" | "alquiler");
      fromPrice = Math.min(...prices);
    }
  }

  const surfaces = units
    .map((u) => u.surface_total ?? u.surface_covered)
    .filter((s): s is number => typeof s === "number" && s > 0);

  // Cheapest-first, which is also the order the units render in — so the
  // building's icon is the cover of the unit listed at the top rather than
  // whichever row the database happened to return first.
  const ordered = [...units].sort(
    (a, b) => (a.price_amount ?? Infinity) - (b.price_amount ?? Infinity),
  );

  return {
    key,
    label: buildingLabel(units) ?? "Edificio sin dirección",
    // A registered photo of the building first; the cover of its cheapest
    // unit only as a fallback. That cover sells a unit, so it is usually an
    // interior — at Belgrano 1287 it is a kitchen — and an interior is a poor
    // way to recognise a building.
    coverPhoto:
      buildingPhoto(key) ??
      ordered.find((u) => u.photos?.[0])?.photos?.[0] ??
      null,
    partido: units.find((u) => u.partido)?.partido ?? null,
    units: ordered,
    fromPrice,
    fromCurrency,
    fromOperation,
    surfaceMin: surfaces.length ? Math.min(...surfaces) : null,
    surfaceMax: surfaces.length ? Math.max(...surfaces) : null,
  };
}

export default async function EdificiosPage() {
  const proximity = await getPropertiesByProximity(ZONA_SUR_CENTER, {
    limit: Number.MAX_SAFE_INTEGER,
  });
  const rows = proximity.data as unknown as Row[];

  const grouped = groupByBuilding(rows);
  const buildings = [...grouped.entries()]
    .map(([key, units]) => toGroup(key, units))
    // Biggest buildings first — comparing units within one is what the page
    // is for, so the ones with something to compare lead. Ties by name so the
    // order does not shuffle between requests.
    .sort(
      (a, b) =>
        b.units.length - a.units.length || a.label.localeCompare(b.label, "es"),
    );

  // Everything with a parcel is now in a group, so what is left over is
  // exactly the properties the cadastre could not place.
  const groupedIds = new Set(buildings.flatMap((b) => b.units.map((u) => u.id)));
  const withoutParcel = rows.filter((r) => !groupedIds.has(r.id));

  return (
    <main className="min-h-screen flex flex-col">
      <PublicHeader active="edificios" />

      <section className="px-4 py-14 sm:py-20">
        <div className="max-w-5xl mx-auto">
          <Reveal className="max-w-2xl">
            <p
              className="text-xs uppercase tracking-[0.2em] font-medium"
              style={{ color: "var(--brand-gold)" }}
            >
              Por edificio
            </p>
            <h1
              className="mt-3 font-heading font-medium text-3xl sm:text-4xl tracking-tight"
              style={{ color: "var(--brand-heading)" }}
            >
              Edificios
            </h1>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground">
              Las unidades agrupadas por el edificio en el que están. No las
              juntamos por el texto de la dirección: dos unidades están en el
              mismo edificio cuando comparten la parcela, y la parcela es un
              dato del registro oficial.
            </p>
          </Reveal>

          {buildings.length === 0 ? (
            <div className="mt-10 rounded-3xl border bg-card p-8 text-center text-sm text-muted-foreground">
              Todavía no hay propiedades publicadas con parcela verificada.
            </div>
          ) : (
            <div className="mt-10 sm:mt-14 space-y-8 sm:space-y-10">
              {/* One building at a time rather than the block at once. The
                  stagger is capped: past a handful of buildings a per-index
                  delay stops reading as rhythm and starts reading as the page
                  being slow to load (§2 — movement with a job, and here the
                  job is guiding the eye down the list). */}
              {buildings.map((b, i) => (
                <Reveal key={b.key} delayMs={Math.min(i, 3) * 90}>
                  <BuildingGroup building={b} />
                </Reveal>
              ))}
            </div>
          )}

          {withoutParcel.length > 0 && (
            <Reveal className="mt-12 rounded-2xl border border-dashed p-5 sm:p-6">
              <p className="text-sm text-muted-foreground">
                {withoutParcel.length === 1
                  ? "Hay 1 propiedad publicada que todavía no tiene la parcela verificada, así que no podemos ubicarla en un edificio."
                  : `Hay ${withoutParcel.length} propiedades publicadas que todavía no tienen la parcela verificada, así que no podemos ubicarlas en un edificio.`}{" "}
                Están en el catálogo completo.
              </p>
              <Link
                href="/propiedades"
                className={`${buttonVariants({ variant: "outline", size: "sm" })} mt-3`}
              >
                Ver todas las propiedades
              </Link>
            </Reveal>
          )}
        </div>
      </section>

      <WhatsAppFloat />
    </main>
  );
}
