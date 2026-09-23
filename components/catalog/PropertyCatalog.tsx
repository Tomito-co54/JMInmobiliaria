import { Reveal } from "@/components/shared/Reveal";
import type { BuildingSummary } from "@/lib/buildings";
import type { CatalogProperty } from "@/lib/catalog/filters";
import { PropertyCatalogList } from "@/components/catalog/PropertyCatalogList";

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
 * Scroll-reveal per card via the shared Reveal island. Filtering and the
 * match order live in PropertyCatalogList, on the client.
 */
export function PropertyCatalog({
  properties,
  totalProperties,
  buildings,
  heading,
  eyebrow,
  intro,
  startWithIntro = false,
}: {
  properties: CatalogProperty[];
  /** Total published count — drives the header copy, not the rendered slice. */
  totalProperties: number;
  /**
   * Buildings with more than one published unit, keyed by parcel. A card
   * whose property is in one shows how many units it shares an address with
   * — without it, four listings on the same parcel read as four unrelated
   * properties, or as a duplicate.
   */
  buildings?: Record<string, BuildingSummary>;
  /** Overridable so the page and any future embed can title it in context. */
  eyebrow?: string;
  heading?: string;
  intro?: string;
  /** Open on the three-question intro instead of the results. */
  startWithIntro?: boolean;
}) {
  const eyebrowText = eyebrow ?? "El catálogo";
  const headingText = heading ?? "Propiedades disponibles";
  const introText =
    intro ??
    (totalProperties > 0
      ? `${totalProperties} ${
          totalProperties === 1 ? "propiedad publicada" : "propiedades publicadas"
        } en Zona Sur GBA.`
      : "Estamos cargando las primeras propiedades.");

  return (
    <section
      id="catalogo"
      className="px-4 pb-20 sm:pb-28 border-t bg-muted/30 scroll-mt-16 pt-14 sm:pt-20"
    >
      {/* Wider than the landing's 5xl: the results share the row with the
          search board on a wide screen. */}
      <div className="max-w-6xl mx-auto">
        {properties.length === 0 ? (
          <>
            <Reveal className="max-w-2xl mb-10 sm:mb-14">
              <p
                className="text-xs uppercase tracking-[0.2em] font-medium"
                style={{ color: "var(--brand-gold)" }}
              >
                {eyebrowText}
              </p>
              <h2
                className="mt-3 font-heading font-medium text-3xl sm:text-4xl tracking-tight"
                style={{ color: "var(--brand-heading)" }}
              >
                {headingText}
              </h2>
              <p className="mt-3 text-sm sm:text-base text-muted-foreground">{introText}</p>
            </Reveal>
            <div className="rounded-3xl border bg-card p-8 text-center text-sm text-muted-foreground">
              Todavía no hay propiedades publicadas. Volvé pronto.
            </div>
          </>
        ) : (
          // The list itself is a client island: it opens on the intro, is
          // filtered by the board and the bar it draws, and is ordered by the
          // visitor's match, which only exists in the browser. It draws its
          // own heading because the intro replaces it.
          <PropertyCatalogList
            properties={properties}
            buildings={buildings ?? {}}
            startWithIntro={startWithIntro}
            eyebrow={eyebrowText}
            heading={headingText}
            intro={introText}
          />
        )}
      </div>
    </section>
  );
}
