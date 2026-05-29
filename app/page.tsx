import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { getPropertiesByProximity, ZONA_SUR_CENTER } from "@/lib/db/properties";
import { getFavoritedPropertyIds } from "@/lib/db/favorites";
import { PropertyCard } from "@/components/property/PropertyCard";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeProtagonist } from "@/components/home/HomeProtagonist";
import { HomeFeatures } from "@/components/home/HomeFeatures";
import type { QualityBreakdown } from "@/lib/scoring";

const HOME_CATALOG_LIMIT = 12;

interface PropertyRow {
  id: string;
  property_type: string | null;
  partido: string | null;
  address: string | null;
  price_amount: number | null;
  price_currency: "USD" | "ARS" | null;
  rooms: number | null;
  surface_total: number | null;
  surface_arba: number | null;
  photos: string[];
  quality_score_breakdown: QualityBreakdown | null;
}

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Pull a slice of properties to seed the catalog on the landing. With
  // no profile context for anons we order by proximity to the geographic
  // center of our service area (ZONA_SUR_CENTER), so visitors see
  // properties clustered in the most-covered part of GBA first. Match
  // scoring is not run here (no profile, and we want first paint fast).
  // For match-scored discovery the buyer goes to /buscar after signup.
  const { data: rows, count: totalProperties } = await getPropertiesByProximity(
    ZONA_SUR_CENTER,
    { limit: HOME_CATALOG_LIMIT },
  );
  const properties = rows as unknown as PropertyRow[];
  const favoritedIds = user ? await getFavoritedPropertyIds(user.id) : new Set<string>();

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
          it returns null and the home flows straight into the features. */}
      <HomeProtagonist />

      {/* Features — explains the product before showing inventory */}
      <HomeFeatures />

      {/* Catalog */}
      <section
        id="catalogo"
        className="px-4 pb-16 border-t bg-muted/30 scroll-mt-16 pt-10 sm:pt-12"
      >
        <div className="max-w-5xl mx-auto space-y-6">
          <header className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">
              Propiedades disponibles
            </h2>
            <p className="text-sm text-muted-foreground">
              {totalProperties > 0
                ? `${totalProperties} ${
                    totalProperties === 1 ? "propiedad indexada" : "propiedades indexadas"
                  } en Zona Sur GBA, con scoring de calidad y datos catastrales verificados.`
                : "Estamos cargando las primeras propiedades."}
            </p>
          </header>

          {properties.length === 0 ? (
            <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
              Todavía no hay propiedades cargadas. Volvé pronto.
            </div>
          ) : (
            <>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {properties.map((p) => (
                  <li key={p.id}>
                    <PropertyCard
                      property={{
                        id: p.id,
                        property_type: p.property_type,
                        partido: p.partido,
                        address: p.address,
                        price_amount: p.price_amount,
                        price_currency: p.price_currency,
                        rooms: p.rooms,
                        surface_total: p.surface_total,
                        surface_arba: p.surface_arba,
                        photos: p.photos,
                      }}
                      qualityBreakdown={p.quality_score_breakdown}
                      matchBreakdown={null}
                      isFavorited={favoritedIds.has(p.id)}
                      signedOut={!user}
                    />
                  </li>
                ))}
              </ul>

              <div className="flex justify-center pt-2">
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
    </main>
  );
}
