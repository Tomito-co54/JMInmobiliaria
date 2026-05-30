import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { BrandLogo } from "@/components/shared/BrandLogo";
import {
  getPropertiesByProximity,
  getFeaturedProperty,
  ZONA_SUR_CENTER,
} from "@/lib/db/properties";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeProtagonist } from "@/components/home/HomeProtagonist";
import { HomeGuarantees } from "@/components/home/HomeGuarantees";
import { HomeCatalog } from "@/components/home/HomeCatalog";
import type { PremiumCardProperty } from "@/components/home/PropertyPremiumCard";

const HOME_CATALOG_LIMIT = 6;

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The protagonista (rotating featured property) and the catalog slice run
  // in parallel. getFeaturedProperty is deterministic within a day, so the
  // id we exclude from the catalog matches what HomeProtagonist renders.
  const [featured, proximity] = await Promise.all([
    getFeaturedProperty(),
    // Proximity sort to ZONA_SUR_CENTER seeds the catalog for anons with no
    // profile — properties clustered in the most-covered part of GBA first.
    getPropertiesByProximity(ZONA_SUR_CENTER, { limit: HOME_CATALOG_LIMIT }),
  ]);

  const allRows = proximity.data as unknown as PremiumCardProperty[];
  // The protagonista is the spotlight above — don't list it again below.
  // Exception: if it's the ONLY published property, still show it as a
  // premium card so the catalog isn't empty while inventory is small.
  const withoutFeatured = featured
    ? allRows.filter((p) => p.id !== featured.id)
    : allRows;
  const catalog = withoutFeatured.length > 0 ? withoutFeatured : allRows;

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-4 py-3 border-b">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <Link
            href="/"
            aria-label="Jotaeme — inicio"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <BrandLogo variant="isotipo" size={32} priority />
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/guia-de-compra"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "hidden sm:inline-flex",
              )}
            >
              Guía de compra
            </Link>
            {user && (
              <Link href="/dashboard" className={buttonVariants({ size: "sm" })}>
                Ir al dashboard
              </Link>
            )}
          </div>
        </div>
      </header>

      <HomeHero />

      {/* Protagonista — the brand-signature showpiece (§2.6). Renders only
          when there's a curated is_featured + publicada property; otherwise
          it returns null and the home flows straight into the guarantees. */}
      <HomeProtagonist property={featured} />

      {/* Garantías — explains the product (two tones) before the catalog.
          La propiedad destacada alimenta el diagrama ARBA (partida + m²). */}
      <HomeGuarantees featured={featured} />

      {/* Catálogo — premium cards alternadas (§5 del rediseño) */}
      <HomeCatalog properties={catalog} totalProperties={proximity.count} />
    </main>
  );
}
