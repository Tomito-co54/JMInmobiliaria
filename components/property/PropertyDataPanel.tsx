import { BedDouble, Bath, Maximize2, Car, FileText, ExternalLink, Download } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FavoriteButton } from "./FavoriteButton";
import { PropertyScorePanel } from "./PropertyScorePanel";
import { WhatsAppButton } from "./WhatsAppButton";
import { MatchScoreCard } from "@/components/matching/MatchScoreCard";
import type { QualityBreakdown } from "@/lib/scoring";
import type { MatchBreakdown } from "@/lib/matching";
import { PAID_SERVICES_PUBLIC } from "@/lib/services/offering";

/**
 * The sticky data panel (desktop right column / mobile inline block of the
 * rediseño /p/[id]). Unifies price, specs, score, match and CTAs into ONE
 * cohesive credential surface instead of separate stacked cards (§2.5,
 * directly addressing the "cards apiladas" problem from the plan).
 *
 * Server Component — only the score ring (PropertyScorePanel), the match
 * sheet (MatchScoreCard) and the favorite button are client islands.
 */

const SOURCE_LABELS: Record<string, string> = {
  zonaprop: "Zonaprop",
  argenprop: "Argenprop",
  mercadolibre: "MercadoLibre",
  trezza: "Trezza Propiedades",
  owner_direct: "el dueño",
  agency: "la inmobiliaria",
};

function fmtPrice(amount: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(amount);
}

interface PropertyDataPanelProps {
  propertyId: string;
  address: string | null;
  priceAmount: number | null;
  priceCurrency: "USD" | "ARS" | null;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  garages: number | null;
  surfaceTotal: number | null;
  surfaceArba: number | null;
  qualityBreakdown: QualityBreakdown | null;
  matchBreakdown: MatchBreakdown | null;
  matchProfileName: string | null;
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
  rooms,
  bedrooms,
  bathrooms,
  garages,
  surfaceTotal,
  surfaceArba,
  qualityBreakdown,
  matchBreakdown,
  matchProfileName,
  source,
  sourceUrl,
  isFavorited,
  signedOut,
}: PropertyDataPanelProps) {
  const surface = surfaceArba ?? surfaceTotal;
  const sourceLabel = SOURCE_LABELS[source] ?? source;

  const specs = [
    rooms !== null ? { icon: null, value: rooms, label: "amb" } : null,
    bedrooms !== null ? { icon: BedDouble, value: bedrooms, label: "dorm" } : null,
    bathrooms !== null
      ? { icon: Bath, value: bathrooms, label: bathrooms === 1 ? "baño" : "baños" }
      : null,
    garages !== null && garages > 0
      ? { icon: Car, value: garages, label: garages === 1 ? "cochera" : "cocheras" }
      : null,
    surface !== null ? { icon: Maximize2, value: surface, label: "m²" } : null,
  ].filter((s): s is { icon: typeof BedDouble | null; value: number; label: string } => s !== null);

  return (
    <div className="rounded-3xl border bg-card p-5 sm:p-6 lg:p-7 space-y-6">
      {/* Price — Fraunces, the personality moment */}
      <div>
        {priceAmount !== null && priceCurrency ? (
          <p className="font-heading text-3xl sm:text-4xl font-medium tracking-tight tabular-nums">
            {priceCurrency} {fmtPrice(priceAmount)}
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

      {/* Score — integrated, not a card */}
      <PropertyScorePanel breakdown={qualityBreakdown} />

      {/* Match — only when there's a profile */}
      {matchBreakdown && matchProfileName && (
        <>
          <div className="h-px bg-border" />
          <MatchScoreCard breakdown={matchBreakdown} profileName={matchProfileName} />
        </>
      )}

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
