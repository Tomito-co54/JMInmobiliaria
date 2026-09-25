import { PublicHeader } from "@/components/shared/PublicHeader";
import { getTopLocalidades } from "@/lib/db/properties";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeZonas } from "@/components/home/HomeZonas";
import { HomeMapTeaser } from "@/components/home/HomeMapTeaser";
import { HomeGuarantees } from "@/components/home/HomeGuarantees";
import { WhatsAppFloat } from "@/components/home/WhatsAppFloat";

export default async function Home() {
  // The catalog moved to /propiedades. The landing keeps one property per
  // zone — the covers, which are showpieces and not a listing — and sends
  // everyone to the catalog from the hero, the covers and the header.
  const zonas = await getTopLocalidades();

  return (
    <main className="min-h-screen flex flex-col">
      <PublicHeader />

      <HomeHero zonas={zonas} />

      {/* The zone covers — one slide per zone the agency publishes in, each
          fronted by one property (lib/zonas). Took the protagonist's place on
          25-sep-2026. Returns null while nothing is published. */}
      <HomeZonas />

      {/* The map as a still, with the pins on their parcels. One tap opens
          the real map on /propiedades. Returns null while nothing published
          has a position. */}
      <HomeMapTeaser />

      {/* Garantías — explains the product (two tones). */}
      <HomeGuarantees />

      {/* Lead CTA flotante — presente en todo el scroll de la home */}
      <WhatsAppFloat />
    </main>
  );
}
