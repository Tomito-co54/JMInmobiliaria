import { BedDouble, Bath, Maximize2, Car, CalendarClock, FileText, ExternalLink, Download } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FavoriteButton } from "./FavoriteButton";
import { PropertyMatchPanel } from "./PropertyMatchPanel";
import { WhatsAppButton } from "./WhatsAppButton";
import type { PropertyForMatching } from "@/lib/matching";
import { formatPrice } from "@/lib/property/price";
import { buildingAgeYears } from "@/lib/matching/match";
import { PAID_SERVICES_PUBLIC } from "@/lib/services/offering";

/**
 * The sticky data panel (desktop right column / mobile inline block of the
 * rediseño /p/[id]). Unifies price, specs, score, match and CTAs into ONE
 * cohesive credential surface instead of separate stacked cards (§2.5,
 * directly addressing the "cards apiladas" problem from the plan).
 *
 * Server Component — only the match block (PropertyMatchPanel) and the
 * favorite button are client islands.
 *
 * The Quality Score used to sit where the match sits now. It still ranks the
 * catalog and drives /admin; what it stopped doing is opening the pitch on a
 * property the visitor already chose to look at. "84 de 100" answers how this
 * listing compares to every other; "tu match" answers whether it is for them,
 * which is the question they arrived with.
 */

const SOURCE_LABELS: Record<string, string> = {
  zonaprop: "Zonaprop",
  argenprop: "Argenprop",
  mercadolibre: "MercadoLibre",
  trezza: "Trezza Propiedades",
  owner_direct: "el dueño",
  agency: "la inmobiliaria",
};

interface PropertyDataPanelProps {
  propertyId: string;
  address: string | null;
  priceAmount: number | null;
  priceCurrency: "USD" | "ARS" | null;
  operationType: "venta" | "alquiler" | null;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  garages: number | null;
  surfaceTotal: number | null;
  surfaceCovered: number | null;
  surfaceArba: number | null;
  yearBuilt: number | null;
  /** Fields the client-side matcher scores against. */
  propertyForMatching: PropertyForMatching;
  source: string;
  sourceUrl: string | null;
  isFavorited: boolean;
  signedOut: boolean;
}

export function PropertyDataPanel({
  propertyId,
  address,
  priceAmount,
  priceCurrency,
  operationType,
  rooms,
  bedrooms,
  bathrooms,
  garages,
  surfaceTotal,
  surfaceCovered,
  surfaceArba,
  yearBuilt,
  propertyForMatching,
  source,
  sourceUrl,
  isFavorited,
  signedOut,
}: PropertyDataPanelProps) {
  // Declared first. `surface_arba` is the CADASTRAL PARCEL — the land — which
  // for an apartment is the whole building's lot: the 40 m² units at Belgrano
  // 1287 were each reading "239,23 m²" here, on the page whose promise is that
  // the numbers were checked. The parcel figure is not lost, it is reported in
  // the ARBA section where it is labelled as the parcel and explained.
  //
  // Same call `effectiveSurface` makes for the market stats and the catalog
  // card. This panel was the last place still preferring the parcel — and it
  // contradicted itself two lines down, where the USD/m² already divided by
  // the declared surface.
  const surface = surfaceTotal ?? surfaceArba;
  const age = buildingAgeYears(yearBuilt);
  const sourceLabel = SOURCE_LABELS[source] ?? source;

  type Spec = {
    icon: typeof BedDouble | null;
    value: number | string;
    label: string;
  };

  const specs: Spec[] = ([
    rooms !== null ? { icon: null, value: rooms, label: "amb" } : null,
    bedrooms !== null ? { icon: BedDouble, value: bedrooms, label: "dorm" } : null,
    bathrooms !== null
      ? { icon: Bath, value: bathrooms, label: bathrooms === 1 ? "baño" : "baños" }
      : null,
    garages !== null && garages > 0
      ? { icon: Car, value: garages, label: garages === 1 ? "cochera" : "cocheras" }
      : null,
    surface !== null ? { icon: Maximize2, value: surface, label: "m²" } : null,
    // Split, when there is one to show. For a house the total is the LOT —
    // that is the convention here and it is what the owner loads — so the
    // total alone would read as the size of the house. Talcahuano 258 is
    // 325 m² of land and 95 built; without this chip the panel said "325 m²"
    // for a house you can walk across in fifteen steps.
    //
    // The uncovered figure is derived and not stored: a third column could
    // disagree with the two it is made of, and the day it did there would be
    // no way to know which one was right.
    surfaceCovered !== null && surface !== null && surface > surfaceCovered
      ? { icon: null, value: surfaceCovered, label: "cubiertos" }
      : null,
    surfaceCovered !== null && surface !== null && surface > surfaceCovered
      ? { icon: null, value: Math.round((surface - surfaceCovered) * 100) / 100, label: "descubiertos" }
      : null,
    // Age of the BUILDING, derived at render time from the construction year.
    // Deliberately not `first_seen_at`, which is how old the ad is.
    age !== null
      ? {
          icon: CalendarClock,
          value: age === 0 ? "a estrenar" : age,
          label: age === 0 ? "" : age === 1 ? "año" : "años",
        }
      : null,
  ] as (Spec | null)[]).filter((s): s is Spec => s !== null);

  return (
    <div className="rounded-3xl border bg-card p-5 sm:p-6 lg:p-7 space-y-6">
      {/* Price — Fraunces, the personality moment */}
      <div>
        {formatPrice(priceAmount, priceCurrency, operationType) ? (
          <p className="font-heading text-3xl sm:text-4xl font-medium tracking-tight tabular-nums">
            {formatPrice(priceAmount, priceCurrency, operationType)}
          </p>
        ) : (
          <p className="text-2xl font-bold text-muted-foreground">Consultar precio</p>
        )}
      </div>

      {/* Specs strip */}
      {specs.length > 0 && (
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {specs.map((s, i) => (
            <li key={i} className="flex items-center gap-1.5 text-muted-foreground">
              {s.icon && <s.icon className="size-4" />}
              <span>
                <span className="font-semibold text-foreground tabular-nums">{s.value}</span>{" "}
                {s.label}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="h-px bg-border" />

      {/* Match — integrated, not a card. Works for anonymous visitors: the
          answers live in the browser, and the matcher is a pure function. */}
      <PropertyMatchPanel property={propertyForMatching} />

      <div className="h-px bg-border" />

      {/* CTAs — WhatsApp is the primary lead path (full width, on top);
          Guardar + Servicios are secondary below it. */}
      <div className="space-y-3">
        <WhatsAppButton address={address} size="lg" className="w-full" />
        <div className="grid grid-cols-2 gap-2">
          <FavoriteButton
            propertyId={propertyId}
            initialFavorited={isFavorited}
            variant="full"
            signedOut={signedOut}
          />
          {/* A plain link, not a fetch + blob: the browser downloads it, the
              filename comes from the route's Content-Disposition, and it
              still works with JavaScript off. */}
          <a
            href={`/p/${propertyId}/ficha.pdf`}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 gap-2")}
          >
            <Download className="size-5" />
            Ficha PDF
          </a>
        </div>

        {PAID_SERVICES_PUBLIC && (
          <Link
            href={`/p/${propertyId}/servicios`}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 w-full gap-2")}
          >
            <FileText className="size-5" />
            Servicios
          </Link>
        )}
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "w-full justify-center gap-2 text-muted-foreground hover:text-foreground",
            )}
          >
            <ExternalLink className="size-3.5" />
            Ver listing original en {sourceLabel}
          </a>
        )}
      </div>
    </div>
  );
}
