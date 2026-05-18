import { MessageCircle, ExternalLink } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { FavoriteButton } from "./FavoriteButton";
import { cn } from "@/lib/utils";

/**
 * Call-to-action footer of the property view.
 *
 *   [Guardar (♡)]    [Contactar]
 *   ──────────────────────────
 *   → Ver listing original (zonaprop)
 *
 * Save is wired to the favorites system (B6.4). Contact stays as a
 * placeholder until Block 7 brings the service catalog.
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
        <Button
          size="lg"
          className="h-12"
          aria-label="Contactar (próximamente)"
          title="Disponible cuando esté el catálogo de servicios"
        >
          <MessageCircle className="size-5" />
          Contactar
        </Button>
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
