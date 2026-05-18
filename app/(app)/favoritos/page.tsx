import Link from "next/link";
import { Heart } from "lucide-react";
import { getCurrentUserId } from "@/lib/db/users";
import { getUserFavorites } from "@/lib/db/favorites";
import { getPrimarySearchProfile } from "@/lib/db/search-profiles";
import {
  computeMatchScore,
  type PropertyForMatching,
} from "@/lib/matching";
import type { QualityBreakdown } from "@/lib/scoring";
import { PropertyCard } from "@/components/property/PropertyCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Favoritos — list of properties the user explicitly saved.
 *
 * Layout reuses PropertyCard. Match score is computed against the
 * user's primary profile when available, so the badge keeps making sense
 * even after the user edits their profile (the favorite stays put but
 * the match number updates).
 */

export const metadata = {
  title: "Favoritos — Jotaeme",
};

interface FavoriteRow {
  id: string;
  property_id: string;
  notes: string | null;
  created_at: string;
  properties: {
    id: string;
    property_type: string | null;
    partido: string | null;
    operation_type: string | null;
    price_amount: number | null;
    price_currency: "USD" | "ARS" | null;
    rooms: number | null;
    bedrooms: number | null;
    surface_total: number | null;
    surface_arba: number | null;
    garages: number | null;
    address: string | null;
    photos: string[];
    description: string | null;
    quality_score_breakdown: QualityBreakdown | null;
    is_active: boolean;
  };
}

export default async function FavoritosPage() {
  const userId = await getCurrentUserId();
  if (!userId) {
    // The (app) layout already redirects unauthenticated users; keep the
    // type narrowing local so the rest of this function can assume userId.
    return null;
  }

  const [favorites, profile] = await Promise.all([
    getUserFavorites(userId) as unknown as Promise<FavoriteRow[]>,
    getPrimarySearchProfile(),
  ]);

  if (favorites.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Favoritos</h1>
        </header>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart className="size-4" />
              Sin favoritos todavía
            </CardTitle>
            <CardDescription>
              Tocá el corazón en cualquier propiedad para guardarla acá.
              Vas a poder volver fácil y vamos a avisarte si baja de precio.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/buscar"
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Explorar propiedades
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Favoritos</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {favorites.length}{" "}
          {favorites.length === 1 ? "propiedad guardada" : "propiedades guardadas"}.
        </p>
      </header>

      <ul className="space-y-3">
        {favorites.map((fav) => {
          const p = fav.properties;
          if (!p) return null;
          const propertyForMatching: PropertyForMatching = {
            partido: p.partido,
            property_type: p.property_type,
            operation_type: p.operation_type,
            price_amount: p.price_amount,
            price_currency: p.price_currency,
            rooms: p.rooms,
            bedrooms: p.bedrooms,
            surface_total: p.surface_total,
            surface_arba: p.surface_arba,
            garages: p.garages,
            description: p.description,
          };
          const match = profile ? computeMatchScore(propertyForMatching, profile) : null;
          return (
            <li key={fav.id}>
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
                matchBreakdown={match}
                isFavorited
              />
              {!p.is_active && (
                <p className="text-xs text-amber-600 mt-1 px-3">
                  ⚠️ Este aviso ya no está activo
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
