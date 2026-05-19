import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { getProperties } from "@/lib/db/properties";
import { getFavoritedPropertyIds } from "@/lib/db/favorites";
import { PropertyCard } from "@/components/property/PropertyCard";
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

  // Pull a slice of recent properties to seed the catalog right on the
  // landing. We don't run match scoring here (no profile context for
  // anons, and we don't want to slow down the first paint of the home).
  // For match-scored discovery the buyer goes to /buscar after signup.
  const { data: rows, count: totalProperties } = await getProperties({
    limit: HOME_CATALOG_LIMIT,
  });
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
          {user ? (
            <Link href="/dashboard" className={buttonVariants({ size: "sm" })}>
              Ir al dashboard
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Iniciar sesión
              </Link>
              <Link href="/register" className={buttonVariants({ size: "sm" })}>
                Crear cuenta
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 pt-12 pb-10 sm:pt-16 sm:pb-14">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div className="flex justify-center">
            <BrandLogo variant="full" size={140} />
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">
            Comprá tu propiedad con información{" "}
            <span className="text-primary">verificada</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground">
            Datos catastrales cruzados con ARBA, scoring transparente de cada
            propiedad y servicios automatizados para que decidas con seguridad.
          </p>
          <p className="text-sm text-muted-foreground">
            Zona Sur GBA: Lomas, Banfield, Lanús, Avellaneda, Quilmes.
          </p>
          {!user && (
            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Link href="/register" className={buttonVariants({ size: "lg" })}>
                Empezar gratis
              </Link>
              <a
                href="#catalogo"
                className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "gap-1")}
              >
                Ver propiedades
                <ArrowRight className="size-4" />
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Features — explains the product before showing inventory */}
      <HomeFeatures />

      {/* Catalog */}
      <section
        id="catalogo"
        className="px-4 pb-16 border-t bg-muted/30 scroll-mt-16 pt-10 sm:pt-12"
      >
        <div className="max-w-3xl mx-auto space-y-6">
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
              <ul className="space-y-3">
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
