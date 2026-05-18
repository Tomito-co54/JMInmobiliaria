import Image from "next/image";
import Link from "next/link";
import { MapPin, ImageIcon } from "lucide-react";
import {
  getMatchBand,
  type MatchBreakdown,
} from "@/lib/matching";
import {
  getScoreBand,
  type ScoreBand,
} from "@/lib/scoring/bands";
import type { QualityBreakdown } from "@/lib/scoring";
import { FavoriteButton } from "./FavoriteButton";
import { cn } from "@/lib/utils";

/**
 * Reusable property card for /buscar, /favoritos, and any future surface
 * that lists properties.
 *
 *   [foto] USD 200.000 ♡
 *          Casa · 3 amb · 100m²
 *          Lomas de Zamora
 *          [Match 87] [Quality 72]
 *
 * Per the design lock with the owner: when a profile exists, Match and
 * Quality are visually equal. When there's no profile, only Quality
 * is shown (no fake "match" badge that would mean nothing).
 *
 * The whole card is a single Link to /p/[id]; the favorite button sits
 * above it and stops propagation so clicks don't double-fire.
 */

const TYPE_LABELS: Record<string, string> = {
  casa: "Casa",
  departamento: "Depto",
  ph: "PH",
  lote: "Lote",
  local: "Local",
};

interface PropertyCardProperty {
  id: string;
  property_type: string | null;
  partido: string | null;
  address: string | null;
  price_amount: number | null;
  price_currency: "USD" | "ARS" | null;
  rooms: number | null;
  surface_total: number | null;
  surface_arba: number | null;
  photos: string[];
}

interface PropertyCardProps {
  property: PropertyCardProperty;
  qualityBreakdown: QualityBreakdown | null;
  /** Null when the user has no search profile — the Match badge is hidden. */
  matchBreakdown: MatchBreakdown | null;
  /** Initial favorited state — the page that renders this knows which IDs are saved. */
  isFavorited: boolean;
  /** True when no user session — the heart shows a "login required" toast on click. */
  signedOut?: boolean;
}

function fmtPrice(amount: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(amount);
}

function BandBadge({
  label,
  value,
  band,
  hex,
}: {
  label: string;
  value: number | null;
  band: ScoreBand | { label: string };
  hex: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.7rem] font-medium"
      style={{
        backgroundColor: `${hex}15`,
        color: hex,
        borderColor: `${hex}33`,
      }}
    >
      <span className="text-muted-foreground/80 text-[0.65rem] uppercase tracking-wider">{label}</span>
      <span className="font-bold tabular-nums" style={{ color: hex }}>
        {value ?? "—"}
      </span>
      <span className="opacity-70 text-[0.65rem]">{band.label}</span>
    </span>
  );
}

export function PropertyCard({
  property,
  qualityBreakdown,
  matchBreakdown,
  isFavorited,
  signedOut = false,
}: PropertyCardProps) {
  const cover = property.photos[0];
  const surface = property.surface_arba ?? property.surface_total ?? null;
  const typeLabel = property.property_type
    ? TYPE_LABELS[property.property_type] ?? property.property_type
    : null;

  const qualityBand = getScoreBand(property["price_amount"] === null ? null : qualityBreakdown?.score ?? null);
  const matchBand = matchBreakdown ? getMatchBand(matchBreakdown.score) : null;

  return (
    <article className="group relative rounded-lg border bg-card overflow-hidden transition-shadow hover:shadow-md">
      <Link
        href={`/p/${property.id}`}
        className="flex gap-3 p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
        aria-label={`Ver ${property.address ?? "propiedad"}`}
      >
        <div className="relative shrink-0 w-32 sm:w-40 aspect-[4/3] bg-muted rounded-md overflow-hidden">
          {cover ? (
            <Image
              src={cover}
              alt={property.address ?? "Propiedad"}
              fill
              sizes="(max-width: 640px) 128px, 160px"
              className="object-cover"
            />
          ) : (
            <div className="size-full grid place-items-center text-muted-foreground">
              <ImageIcon className="size-6" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          {property.price_amount !== null && property.price_currency ? (
            <p className="text-lg font-bold tabular-nums leading-tight">
              {property.price_currency} {fmtPrice(property.price_amount)}
            </p>
          ) : (
            <p className="text-base font-bold text-muted-foreground leading-tight">
              Consultar precio
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {[typeLabel, property.rooms !== null ? `${property.rooms} amb` : null, surface !== null ? `${surface}m²` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {property.address && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">
                {property.address}
                {property.partido && <span>, {property.partido}</span>}
              </span>
            </p>
          )}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            {matchBand && matchBreakdown && (
              <BandBadge
                label="Match"
                value={matchBreakdown.score}
                band={matchBand}
                hex={matchBand.hex}
              />
            )}
            {qualityBreakdown?.score !== undefined && (
              <BandBadge
                label="Quality"
                value={qualityBreakdown?.score ?? null}
                band={qualityBand}
                hex={qualityBand.hex}
              />
            )}
          </div>
        </div>
      </Link>

      <div className={cn("absolute top-2 right-2 z-10")}>
        <FavoriteButton
          propertyId={property.id}
          initialFavorited={isFavorited}
          variant="overlay"
          signedOut={signedOut}
        />
      </div>
    </article>
  );
}
