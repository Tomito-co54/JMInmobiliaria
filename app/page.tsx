import { PublicHeader } from "@/components/shared/PublicHeader";
import { getFeaturedProperty } from "@/lib/db/properties";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeProtagonist } from "@/components/home/HomeProtagonist";
import { HomeGuarantees } from "@/components/home/HomeGuarantees";
import { WhatsAppFloat } from "@/components/home/WhatsAppFloat";

export default async function Home() {
  // The catalog moved to /propiedades. The landing keeps the one property it
  // actually needs — the protagonista, which is a showpiece and not a listing
  // — and sends everyone to the catalog from the hero and the header.
  const featured = await getFeaturedProperty();

  return (
    <main className="min-h-screen flex flex-col">
      <PublicHeader />

      <HomeHero />

      {/* Protagonista — the brand-signature showpiece (§2.6). Renders only
          when there's a curated is_featured + publicada property; otherwise
          it returns null and the home flows straight into the guarantees. */}
      <HomeProtagonist property={featured} />

      {/* Garantías — explains the product (two tones). */}
      <HomeGuarantees />

      {/* Lead CTA flotante — presente en todo el scroll de la home */}
      <WhatsAppFloat />
    </main>
  );
}
