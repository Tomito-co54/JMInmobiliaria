import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PublicHeader } from "@/components/shared/PublicHeader";
import { WhatsAppFloat } from "@/components/home/WhatsAppFloat";
import {
  BuildingGroup,
  type BuildingGroupData,
} from "@/components/catalog/BuildingGroup";
import { buildingLabel, groupByBuilding } from "@/lib/buildings";
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
 * Grouping comes from the cadastral parcel (lib/buildings), so it is ARBA
 * saying these units share a building, not string matching on the address.
 *
 * A building with one published unit is not shown as a building: it would be
 * /propiedades again with a heading on top. Those, and any property whose
 * parcel ARBA could not resolve, are named at the foot of the page and linked
 * — this page groups the catalog, it must never look like the whole of it.
 */

export const metadata: Metadata = {
  title: "Edificios — Jotaeme",
  description:
    "Las unidades publicadas agrupadas por edificio, según la parcela catastral de ARBA.",
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
  // Only compare what is comparable — the cheapest within the currency most
  // units use, the same rule summariseBuildings applies to the catalog badge.
  const byCurrency = new Map<string, number[]>();
  for (const u of priced) {
    const list = byCurrency.get(u.price_currency);
    if (list) list.push(u.price_amount);
    else byCurrency.set(u.price_currency, [u.price_amount]);
  }
  let fromPrice: number | null = null;
  let fromCurrency: "USD" | "ARS" | null = null;
  let most = 0;
  for (const [currency, prices] of byCurrency) {
    if (prices.length > most) {
      most = prices.length;
      fromCurrency = currency as "USD" | "ARS";
      fromPrice = Math.min(...prices);
    }
  }

  const surfaces = units
    .map((u) => u.surface_total ?? u.surface_covered)
    .filter((s): s is number => typeof s === "number" && s > 0);

  return {
    key,
    label: buildingLabel(units) ?? "Edificio sin dirección",
    partido: units.find((u) => u.partido)?.partido ?? null,
    units: [...units].sort(
      (a, b) => (a.price_amount ?? Infinity) - (b.price_amount ?? Infinity),
    ),
    fromPrice,
    fromCurrency,
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
    .filter(([, units]) => units.length > 1)
    .map(([key, units]) => toGroup(key, units))
    // Biggest buildings first — that is what the page is for. Ties by name so
    // the order does not shuffle between requests.
    .sort(
      (a, b) =>
        b.units.length - a.units.length || a.label.localeCompare(b.label, "es"),
    );

  const groupedIds = new Set(buildings.flatMap((b) => b.units.map((u) => u.id)));
  const loose = rows.filter((r) => !groupedIds.has(r.id));

  return (
    <main className="min-h-screen flex flex-col">
      <PublicHeader active="edificios" />

      <section className="px-4 py-14 sm:py-20">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-2xl">
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
              mismo edificio cuando comparten la parcela catastral, y eso lo
              dice ARBA.
            </p>
          </div>

          {buildings.length === 0 ? (
            <div className="mt-10 rounded-3xl border bg-card p-8 text-center text-sm text-muted-foreground">
              Todavía no hay ningún edificio con más de una unidad publicada.
            </div>
          ) : (
            <div className="mt-10 sm:mt-14 space-y-8 sm:space-y-10">
              {buildings.map((b) => (
                <BuildingGroup key={b.key} building={b} />
              ))}
            </div>
          )}

          {loose.length > 0 && (
            <div className="mt-12 rounded-2xl border border-dashed p-5 sm:p-6">
              <p className="text-sm text-muted-foreground">
                {loose.length === 1
                  ? "Hay 1 propiedad publicada que no comparte edificio con ninguna otra."
                  : `Hay ${loose.length} propiedades publicadas que no comparten edificio con ninguna otra.`}{" "}
                Están en el catálogo completo.
              </p>
              <Link
                href="/propiedades"
                className={`${buttonVariants({ variant: "outline", size: "sm" })} mt-3`}
              >
                Ver todas las propiedades
              </Link>
            </div>
          )}
        </div>
      </section>

      <WhatsAppFloat />
    </main>
  );
}
