import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import type { BuildingUnitRow } from "@/lib/db/properties";
import { formatPrice, operationNoun } from "@/lib/property/price";

/**
 * "Otras unidades en este edificio" — the sibling listings standing on the
 * same cadastral parcel (see lib/buildings).
 *
 * Placed on the property page rather than only in the catalog because this
 * is where the question gets asked: someone looking at a 2-ambiente on the
 * first floor wants to know whether there is a cheaper one, or one with a
 * terrace, in the same building. Until now four listings at the same address
 * read as four unrelated cards, or worse, as a duplicate.
 *
 * A row, not a card grid (§6 blacklist): photo, address, price, and the two
 * facts that separate one unit from another — surface and rooms.
 */
function fmtSpecs(u: BuildingUnitRow): string {
  const bits: string[] = [];
  // The operation leads, and it is not decoration here. These rows show a
  // price with no type label beside it, and a neighbouring unit can be the
  // other operation than the listing being read — a building with three flats
  // for sale and one to let would otherwise put "$ 450.000" in a column of
  // dollar sale prices with nothing to separate them.
  const op = operationNoun(u.operation_type);
  if (op) bits.push(op);
  if (u.rooms) bits.push(`${u.rooms} amb`);
  const surface = u.surface_total ?? u.surface_covered;
  if (surface) bits.push(`${surface} m²`);
  return bits.join(" · ");
}

export function BuildingUnits({ units }: { units: BuildingUnitRow[] }) {
  if (units.length === 0) return null;

  return (
    <ul className="space-y-2">
      {units.map((u) => {
        const cover = u.photos?.[0];
        return (
          <li key={u.id}>
            <Link
              href={`/p/${u.id}`}
              className="group flex items-center gap-3 rounded-lg border p-2.5 transition-colors hover:bg-muted/50"
            >
              <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted">
                {cover && (
                  <Image
                    src={cover}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-sm font-medium"
                  style={{ color: "var(--brand-heading)" }}
                >
                  {u.address ?? "Unidad sin dirección"}
                </p>
                <p className="text-xs text-muted-foreground">{fmtSpecs(u)}</p>
              </div>

              <div className="shrink-0 text-right">
                <p
                  className="text-sm font-semibold tabular-nums"
                  style={{ color: "var(--brand-heading)" }}
                >
                  {formatPrice(u.price_amount, u.price_currency, u.operation_type, {
                    compact: true,
                  }) ?? "Consultar"}
                </p>
              </div>

              <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
