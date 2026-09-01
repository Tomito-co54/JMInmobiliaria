import { Reveal } from "@/components/home/HomeGuaranteesClient";
import { buildingKey, type BuildingSummary } from "@/lib/buildings";
import {
  PropertyPremiumCard,
  type PremiumCardProperty,
} from "@/components/catalog/PropertyPremiumCard";

/**
 * The published catalog: large premium cards, one per row, the photo side
 * alternating (PropertyPremiumCard.flip). No 2-col grid of fichas (§6
 * blacklist).
 *
 * It lived on the landing until the inventory outgrew it — which the old
 * comment at the foot of this file predicted almost word for word. Now it is
 * a page of its own at /propiedades and the landing links to it, so the
 * landing argues and the catalog lists. The protagonista stays on the home:
 * it is a showpiece, not a listing.
 *
 * Scroll-reveal per card via the shared Reveal island.
 */
export function PropertyCatalog({
  properties,
  totalProperties,
  buildings,
  heading,
  eyebrow,
  intro,
}: {
  properties: PremiumCardProperty[];
  /** Total published count — drives the header copy, not the rendered slice. */
  totalProperties: number;
  /**
   * Buildings with more than one published unit, keyed by parcel. A card
   * whose property is in one shows how many units it shares an address with
   * — without it, four listings on the same parcel read as four unrelated
   * properties, or as a duplicate.
   */
  buildings?: Map<string, BuildingSummary>;
  /** Overridable so the page and any future embed can title it in context. */
  eyebrow?: string;
  heading?: string;
  intro?: string;
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
            {eyebrow ?? "El catálogo"}
          </p>
          <h2
            className="mt-3 font-heading font-medium text-3xl sm:text-4xl tracking-tight"
            style={{ color: "var(--brand-heading)" }}
          >
            {heading ?? "Propiedades disponibles"}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground">
            {intro ??
              (totalProperties > 0
                ? `${totalProperties} ${
                    totalProperties === 1
                      ? "propiedad publicada"
                      : "propiedades publicadas"
                  } en Zona Sur GBA, cada una con la partida verificada contra ARBA.`
                : "Estamos cargando las primeras propiedades.")}
          </p>
        </Reveal>

        {properties.length === 0 ? (
          <div className="rounded-3xl border bg-card p-8 text-center text-sm text-muted-foreground">
            Todavía no hay propiedades publicadas. Volvé pronto.
          </div>
        ) : (
          <div className="space-y-8 sm:space-y-12">
            {properties.map((p, i) => {
              const flip = i % 2 === 1;
              return (
                // Each card swings in from its photo side (flip → from the
                // right, else from the left) with a small per-card stagger,
                // so scrolling the catalog has rhythm instead of a flat fade
                // (§2.4). Each card re-triggers on its own scroll position.
                <Reveal key={p.id} delayMs={60} direction={flip ? "right" : "left"}>
                  <PropertyPremiumCard
                    property={p}
                    flip={flip}
                    building={buildings?.get(buildingKey(p) ?? "")}
                  />
                </Reveal>
              );
            })}
          </div>
        )}

      </div>
    </section>
  );
}
