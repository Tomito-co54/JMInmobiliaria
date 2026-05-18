import Link from "next/link";
import { FileText, ExternalLink } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { FavoriteButton } from "./FavoriteButton";
import { cn } from "@/lib/utils";

/**
 * Call-to-action footer of the property view.
 *
 *   [Guardar (♡)]    [Servicios]
 *   ──────────────────────────
 *   → Ver listing original (zonaprop)
 *
 * Save is wired to favorites (B6.4). Servicios opens the paid-services
 * catalog (B7.7) — informes catastrales, dominio, etc.
 *
 * The source link is the honesty CTA: every property page links back to
 * its origin so the buyer can cross-check anything we display.
 */

const SOURCE_LABELS: Record<string, string> = {
  zonaprop: "Zonaprop",
  argenprop: "Argenprop",
  mercadolibre: "MercadoLibre",
  trezza: "Trezza Propiedades",
  owner_direct: "el dueño",
  agency: "la inmobiliaria",
};

interface PropertyCTAsProps {
  propertyId: string;
  sourceUrl: string | null;
  source: string;
  isFavorited: boolean;
  /** True when no user session — favorite click prompts login. */
  signedOut?: boolean;
}

export function PropertyCTAs({
  propertyId,
  sourceUrl,
  source,
  isFavorited,
  signedOut = false,
}: PropertyCTAsProps) {
  const sourceLabel = SOURCE_LABELS[source] ?? source;

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <FavoriteButton
          propertyId={propertyId}
          initialFavorited={isFavorited}
          variant="full"
          signedOut={signedOut}
        />
        <Link
          href={`/p/${propertyId}/servicios`}
          className={cn(
            buttonVariants({ size: "lg" }),
            "h-12 gap-2",
          )}
        >
          <FileText className="size-5" />
          Servicios
        </Link>
      </div>

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

      <p className="text-[0.7rem] text-muted-foreground text-center leading-relaxed">
        Esta propiedad fue indexada desde {sourceLabel}. Los datos catastrales
        fueron cruzados contra ARBA por nosotros.
      </p>
    </section>
  );
}
