import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/home/HomeGuaranteesClient";
import {
  PropertyPremiumCard,
  type PremiumCardProperty,
} from "@/components/home/PropertyPremiumCard";

/**
 * Public home catalog (Block 5 del rediseño). The "resto del catálogo":
 * published properties shown as large premium cards, one per row, the
 * photo side alternating (PropertyPremiumCard.flip). No 2-col grid of
 * fichas (§6 blacklist). The protagonista (HomeProtagonist) is the
 * spotlight above; this lists the rest.
 *
 * Scroll-reveal per card via the shared Reveal island.
 */
export function HomeCatalog({
  properties,
  totalProperties,
}: {
  properties: PremiumCardProperty[];
  /** Total published count — drives the header copy, not the rendered slice. */
  totalProperties: number;
}) {
  return (
    <section
      id="catalogo"
      className="px-4 pb-20 sm:pb-28 border-t bg-muted/30 scroll-mt-16 pt-14 sm:pt-20"
    >
      <div className="max-w-5xl mx-auto">
        <Reveal className="max-w-2xl mb-10 sm:mb-14">
          <p
            className="text-xs uppercase tracking-[0.2em] font-medium"
            style={{ color: "var(--brand-gold)" }}
          >
            El catálogo
          </p>
          <h2
            className="mt-3 font-heading font-medium text-3xl sm:text-4xl tracking-tight"
            style={{ color: "var(--brand-heading)" }}
          >
            Propiedades disponibles
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground">
            {totalProperties > 0
              ? `${totalProperties} ${
                  totalProperties === 1 ? "propiedad publicada" : "propiedades publicadas"
                } en Zona Sur GBA, cada una con scoring de calidad y datos catastrales verificados.`
              : "Estamos cargando las primeras propiedades."}
          </p>
        </Reveal>

        {properties.length === 0 ? (
          <div className="rounded-3xl border bg-card p-8 text-center text-sm text-muted-foreground">
            Todavía no hay propiedades publicadas. Volvé pronto.
          </div>
        ) : (
          <>
            <div className="space-y-8 sm:space-y-12">
              {properties.map((p, i) => (
                <Reveal key={p.id} delayMs={i === 0 ? 0 : 80}>
                  <PropertyPremiumCard property={p} flip={i % 2 === 1} />
                </Reveal>
              ))}
            </div>

            <div className="flex justify-center pt-12 sm:pt-16">
              <Link
                href="/buscar"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Ver todas las propiedades
                <ArrowRight className="size-4 ml-1" />
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
