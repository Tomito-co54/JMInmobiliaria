import type { Metadata } from "next";
import { PublicHeader } from "@/components/shared/PublicHeader";
import { PropertyCatalog } from "@/components/catalog/PropertyCatalog";
import { WhatsAppFloat } from "@/components/home/WhatsAppFloat";
import { summariseBuildings } from "@/lib/buildings";
import { getPublicCatalog } from "@/lib/db/properties";
import { catalogOperationLabel } from "@/lib/property/price";
import type { CatalogProperty } from "@/lib/catalog/filters";

/**
 * The catalog, on its own page.
 *
 * It used to be the last section of the landing, which made the landing do two
 * jobs: argue for the agency and list its stock. They want different things
 * from a visitor — one is read once, the other is returned to, linked, and
 * sent to someone — and only the second deserves a URL you can share.
 *
 * Unlike the landing's slice, this lists everything published, and it does not
 * hold back the protagonista: on the landing that property is the showpiece
 * above, so repeating it below was a duplicate; here there is nothing above it
 * to duplicate, and leaving it out would mean the page that promises the whole
 * catalog quietly omits the property the home is promoting.
 */

export const metadata: Metadata = {
  title: "Propiedades — Jotaeme",
  description:
    "Propiedades en venta y alquiler en Zona Sur del Gran Buenos Aires.",
};

export default async function PropiedadesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // A bare /propiedades is someone arriving: it opens on the three-question
  // intro. Any query string — a search, "ver=todas", the map, a shared link —
  // is someone who already knows what they want to see.
  const startWithIntro = Object.keys(await searchParams).length === 0;

  // Everything published, nearest to the centre of Zona Sur first — the seed
  // order for a visitor we know nothing about. Cached between requests.
  const rows = (await getPublicCatalog()) as unknown as CatalogProperty[];
  // A plain object, not a Map: it crosses into the client list.
  const buildings = Object.fromEntries(summariseBuildings(rows));
  // The card paints the cover and nothing else of the gallery, and the whole
  // list crosses to the browser (the match and the filters run there). A
  // partner's listing carries a dozen photos or more: 1.837 URLs went out on
  // every visit to paint 128 covers (24-sep-2026).
  const properties = rows.map((p) => ({ ...p, photos: p.photos?.slice(0, 1) ?? [] }));

  // The heading used to read "Propiedades en venta", which was true for as
  // long as a sale was the only thing loadable. Asked of the catalog instead,
  // it cannot outlive its own contents: it keeps the qualifier while the
  // catalog is one operation and drops it the day it is not.
  const operationLabel = catalogOperationLabel(properties.map((p) => p.operation_type));

  return (
    <main className="min-h-screen flex flex-col">
      <PublicHeader active="propiedades" />

      <PropertyCatalog
        properties={properties}
        totalProperties={properties.length}
        buildings={buildings}
        eyebrow="El catálogo"
        heading={operationLabel ? `Propiedades ${operationLabel}` : "Propiedades"}
        startWithIntro={startWithIntro}
      />

      <WhatsAppFloat />
    </main>
  );
}
