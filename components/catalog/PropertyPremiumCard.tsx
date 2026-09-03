import Image from "next/image";
import { NavPending } from "@/components/shared/NavPending";
import Link from "next/link";
import { MapPin, ArrowRight, ImageIcon } from "lucide-react";
import type { BuildingSummary } from "@/lib/buildings";
import { formatPrice, labelWithOperation } from "@/lib/property/price";
import { PropertyTagChips } from "@/components/property/PropertyTagChips";
import { propertyTypeLabel } from "@/lib/property/types";
import { extrasSpecWords, readExtras } from "@/lib/property/extras";

/**
 * Premium editorial card for the public home catalog (Block 5 del
 * rediseño). Replaces the old PropertyCard (foto chica al costado, estilo
 * Zonaprop) which was the §6 blacklist: "grid de fichas todas iguales".
 *
 * One property per row, large, with the photo on one side and the data on
 * the other — the side ALTERNATES per row (the `flip` prop) so the catalog
 * reads as a rhythm of editorial spreads, not a grid. On mobile it stacks
 * full-width (photo on top, data below).
 *
 * DIRECCION_DE_ARTE references:
 *   §2.6 — the cut-out gesture is reserved for the protagonista; these
 *          cards are a DIFFERENT, calmer treatment (si todo rompe el
 *          cuadrante, nada lo rompe). No bleed, just generous editorial
 *          composition.
 *   §2.2 — hover reveals: the photo zooms slightly; en mobile el tap
 *          navega a la propiedad (toda la card es un Link).
 *   §1   — Fraunces para la dirección (alma editorial), datos en Inter;
 *          la verificación es el ancla seria.
 */

export interface PremiumCardProperty {
  id: string;
  nomenclatura_catastral?: string | null;
  property_type: string | null;
  operation_type?: "venta" | "alquiler" | null;
  partido: string | null;
  address: string | null;
  price_amount: number | null;
  price_currency: "USD" | "ARS" | null;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  surface_total: number | null;
  surface_arba: number | null;
  partida: string | null;
  photos: string[];
  tags?: string[] | null;
  extras?: unknown;
}

export function PropertyPremiumCard({
  property,
  flip = false,
  building,
}: {
  property: PremiumCardProperty;
  /** When true, the photo sits on the right (desktop). Alternates per row. */
  flip?: boolean;
  /** Set when this property shares its parcel with other published units. */
  building?: BuildingSummary;
}) {
  const cover = property.photos?.[0] ?? null;
  // One formatter for every price on the card, so a rental cannot lose its
  // "por mes" on one line and keep it on another.
  // No period on the number: the eyebrow right above it says "en alquiler",
  // and saying it twice makes the price read like a unit of measure.
  const priceText = formatPrice(
    property.price_amount,
    property.price_currency,
    property.operation_type,
  );
  // The exception: this one summarises a cohort of units and has no label of
  // its own, so it keeps the period.
  const buildingFromText = building
    ? formatPrice(building.fromPrice, building.fromCurrency, building.fromOperation, {
        compact: true,
        period: true,
      })
    : null;
  const typeLabel = propertyTypeLabel(property.property_type);
  // Declared first. surface_arba is the PARCEL — for a flat it is the whole
  // building's lot, so leading with it printed "239 m²" on a 40 m² unit.
  // Same mistake as Fase 12, on the card nobody re-checked.
  const surface = property.surface_total ?? property.surface_arba ?? null;
  const heading = property.address ?? [typeLabel, property.partido].filter(Boolean).join(" en ");

  const specs = [
    property.rooms !== null ? `${property.rooms} amb` : null,
    property.bedrooms !== null ? `${property.bedrooms} dorm` : null,
    property.bathrooms !== null
      ? `${property.bathrooms} ${property.bathrooms === 1 ? "baño" : "baños"}`
      : null,
    surface !== null ? `${surface} m²` : null,
    // What comes with the unit, and what can: "cochera opcional" on a card
    // is the difference between 80.000 and 88.000 said before the click.
    ...extrasSpecWords(readExtras(property.extras)),
  ].filter(Boolean);

  return (
    <article className="group rounded-3xl border bg-card overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/30">
      <Link
        href={`/p/${property.id}`}
        aria-label={`Ver ${heading}`}
        className="grid md:grid-cols-2 items-stretch focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-3xl"
      >
        {/* Photo — order flips on desktop; always on top on mobile.

            `self-start` on mobile is load-bearing. The link is a grid with
            `items-stretch`, and on a phone that grid is one column, so the
            photo is a stretched item in a row of its own whose only child is
            absolutely positioned. Chrome sizes that row from the aspect
            ratio; iOS Safari treats a stretched item as having a definite
            height, ignores the aspect ratio, and the row comes out 0px tall
            — the catalog rendered every cover as nothing while the landing
            and /edificios, which do not stretch, showed theirs. Reported by
            Tomy from his phone, 3-sep. `min-h` is the floor in case some
            other engine finds a third reading. */}
        <div
          className={`relative order-1 self-start md:self-stretch aspect-[4/3] min-h-[14rem] md:aspect-auto md:min-h-[20rem] overflow-hidden bg-muted ${
            flip ? "md:order-2" : "md:order-1"
          }`}
        >
          {cover ? (
            <Image
              src={cover}
              alt={heading}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="size-full grid place-items-center text-muted-foreground">
              <ImageIcon className="size-8" />
            </div>
          )}
        </div>

        {/* Data side. */}
        <div
          className={`order-2 flex flex-col justify-center p-6 sm:p-9 ${
            flip ? "md:order-1" : "md:order-2"
          }`}
        >
          {(typeLabel || property.partido) && (
            <p className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
              {[labelWithOperation(typeLabel, property.operation_type), property.partido]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}

          {/* The broker's labels sit between the eyebrow and the price: "Oferta"
              is a claim about the number right under it, and "Apto comercial"
              qualifies the type right above. */}
          <PropertyTagChips tags={property.tags} className="mt-2.5" />

          {priceText ? (
            <p className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums leading-none">
              {priceText}
            </p>
          ) : (
            <p className="mt-2 text-xl font-bold text-muted-foreground leading-none">
              Consultar precio
            </p>
          )}

          <h3
            className="mt-3 font-heading font-medium text-xl sm:text-2xl leading-snug tracking-tight"
            style={{ color: "var(--brand-heading)" }}
          >
            {heading}
          </h3>

          {property.address && property.partido && (
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" />
              {property.partido}
            </p>
          )}

          {specs.length > 0 && (
            <p className="mt-4 text-sm text-muted-foreground">{specs.join(" · ")}</p>
          )}

          {/* Same building. Without this, four units on one parcel read as
              four unrelated listings — or as the same one posted four times.
              Deliberately a line of type and not another chip: the chips
              below carry the credibility signals and a fifth would dilute
              them. */}
          {building && building.unitCount > 1 && (
            <p
              className="mt-2 text-sm font-medium"
              style={{ color: "var(--brand-accent)" }}
            >
              {building.unitCount} unidades en este edificio
              {buildingFromText && (
                <span className="text-muted-foreground font-normal">
                  {" · desde "}
                  {buildingFromText}
                </span>
              )}
            </p>
          )}

          {/* Credibility chip — verification.
              The Quality Score chip used to sit alongside it and was removed
              with the one on /p/[id]: it grades a listing against every other
              listing, which is a question the catalog answers by what it
              chooses to publish, not one to put on each card. The score still
              ranks the catalog and drives /admin. */}
          {/* The whole card is the link; this is where the eye is when the
              tap lands, so it is where the acknowledgement belongs. */}
          <span
            className="relative mt-6 inline-flex items-center gap-1.5 pb-1.5 text-sm font-semibold"
            style={{ color: "var(--brand-heading)" }}
          >
            Ver propiedad
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            <NavPending className="inset-x-0 bottom-0" />
          </span>
        </div>
      </Link>
    </article>
  );
}
