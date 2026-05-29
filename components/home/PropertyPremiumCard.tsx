import Image from "next/image";
import Link from "next/link";
import { MapPin, ShieldCheck, ArrowRight, ImageIcon } from "lucide-react";
import { getScoreBand } from "@/lib/scoring/bands";
import type { QualityBreakdown } from "@/lib/scoring";

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
 *          el score + ARBA son el ancla seria.
 */

const TYPE_LABELS: Record<string, string> = {
  casa: "Casa",
  departamento: "Departamento",
  ph: "PH",
  lote: "Lote",
  local: "Local",
};

export interface PremiumCardProperty {
  id: string;
  property_type: string | null;
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
  quality_score_breakdown: QualityBreakdown | null;
}

function fmtPrice(amount: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(amount);
}

export function PropertyPremiumCard({
  property,
  flip = false,
}: {
  property: PremiumCardProperty;
  /** When true, the photo sits on the right (desktop). Alternates per row. */
  flip?: boolean;
}) {
  const cover = property.photos?.[0] ?? null;
  const typeLabel = property.property_type
    ? TYPE_LABELS[property.property_type] ?? property.property_type
    : null;
  const surface = property.surface_arba ?? property.surface_total ?? null;
  const score = property.quality_score_breakdown?.score ?? null;
  const band = getScoreBand(score);
  const heading = property.address ?? [typeLabel, property.partido].filter(Boolean).join(" en ");

  const specs = [
    property.rooms !== null ? `${property.rooms} amb` : null,
    property.bedrooms !== null ? `${property.bedrooms} dorm` : null,
    property.bathrooms !== null
      ? `${property.bathrooms} ${property.bathrooms === 1 ? "baño" : "baños"}`
      : null,
    surface !== null ? `${surface} m²` : null,
  ].filter(Boolean);

  return (
    <article className="group rounded-3xl border bg-card overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/30">
      <Link
        href={`/p/${property.id}`}
        aria-label={`Ver ${heading}`}
        className="grid md:grid-cols-2 items-stretch focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-3xl"
      >
        {/* Photo — order flips on desktop; always on top on mobile. */}
        <div
          className={`relative order-1 aspect-[4/3] md:aspect-auto md:min-h-[20rem] overflow-hidden bg-muted ${
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
              {[typeLabel, property.partido].filter(Boolean).join(" · ")}
            </p>
          )}

          {property.price_amount !== null && property.price_currency ? (
            <p className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums leading-none">
              {property.price_currency} {fmtPrice(property.price_amount)}
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

          {/* Credibility chips — score + ARBA verification. */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {score !== null && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
                style={{
                  color: band.hex,
                  borderColor: `${band.hex}40`,
                  backgroundColor: `${band.hex}14`,
                }}
              >
                <span className="text-muted-foreground/80 text-[0.65rem] uppercase tracking-wider">
                  Quality
                </span>
                <span className="font-bold tabular-nums">{score}</span>
                <span className="opacity-80">{band.label}</span>
              </span>
            )}
            {property.partida && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
                style={{
                  color: "var(--brand-gold)",
                  borderColor: "color-mix(in srgb, var(--brand-gold) 35%, transparent)",
                  backgroundColor: "color-mix(in srgb, var(--brand-gold) 8%, transparent)",
                }}
              >
                <ShieldCheck className="size-3.5" />
                ARBA
              </span>
            )}
          </div>

          <span
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold"
            style={{ color: "var(--brand-heading)" }}
          >
            Ver propiedad
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </Link>
    </article>
  );
}
