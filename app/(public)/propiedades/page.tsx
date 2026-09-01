import type { Metadata } from "next";
import { PublicHeader } from "@/components/shared/PublicHeader";
import { PropertyCatalog } from "@/components/catalog/PropertyCatalog";
import { WhatsAppFloat } from "@/components/home/WhatsAppFloat";
import { summariseBuildings } from "@/lib/buildings";
import { getPropertiesByProximity, ZONA_SUR_CENTER } from "@/lib/db/properties";
import type { PremiumCardProperty } from "@/components/catalog/PropertyPremiumCard";

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
    "Propiedades en venta en Zona Sur del Gran Buenos Aires, con los datos verificados antes de publicarse.",
};

export default async function PropiedadesPage() {
  // Proximity to ZONA_SUR_CENTER is the seed order for a visitor we know
  // nothing about: the most-covered part of GBA first. No limit — this is the
  // page that is supposed to show all of it.
  const proximity = await getPropertiesByProximity(ZONA_SUR_CENTER, {
    limit: Number.MAX_SAFE_INTEGER,
  });
  const properties = proximity.data as unknown as PremiumCardProperty[];
  const buildings = summariseBuildings(properties);

  return (
    <main className="min-h-screen flex flex-col">
      <PublicHeader active="propiedades" />

      <PropertyCatalog
        properties={properties}
        totalProperties={proximity.count}
        buildings={buildings}
        eyebrow="El catálogo"
        heading="Propiedades en venta"
      />

      <WhatsAppFloat />
    </main>
  );
}
