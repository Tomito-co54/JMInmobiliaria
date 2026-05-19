import Link from "next/link";
import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { getCurrentUserId } from "@/lib/db/users";
import { getFavoritedPropertyIds } from "@/lib/db/favorites";
import {
  getUserSearchProfiles,
  getSearchProfileById,
} from "@/lib/db/search-profiles";
import {
  getMatchedProperties,
  type MatchedPropertyFilters,
} from "@/lib/db/matched-properties";
import { PropertyCard } from "@/components/property/PropertyCard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * /buscar — the discovery surface. Sorts the user's matched properties
 * by match score descending, drops the "No encaja" band (<26), and lets
 * the user narrow further via query-string filters.
 *
 * Profile selection: defaults to the primary; when the user has 2,
 * shows a chip toggle to switch. Switching is via `?profile=<id>` and
 * is server-rendered (no client state).
 *
 * Narrowing filters never widen the profile — to widen you edit the
 * profile itself. The chips here are: tipo, precio máximo, ambientes
 * mínimos.
 */

export const metadata = {
  title: "Buscar — Jotaeme",
};

const TYPE_LABELS: Record<string, string> = {
  casa: "Casa",
  departamento: "Depto",
  ph: "PH",
  lote: "Lote",
  local: "Local",
};

interface PageProps {
  searchParams: Promise<{
    profile?: string;
    tipo?: string;
    precio_max?: string;
    amb?: string;
  }>;
}

function parseOptionalInt(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function buildHref(
  base: { profile?: string; tipo?: string; precio_max?: string; amb?: string },
  patch: Partial<{ tipo: string | null; precio_max: string | null; amb: string | null }>,
): string {
  const params = new URLSearchParams();
  if (base.profile) params.set("profile", base.profile);
  const merged = { ...base, ...patch };
  if (patch.tipo === null) {
    // explicit clear
  } else if (merged.tipo) params.set("tipo", merged.tipo);
  if (patch.precio_max === null) {
    // explicit clear
  } else if (merged.precio_max) params.set("precio_max", merged.precio_max);
  if (patch.amb === null) {
    // explicit clear
  } else if (merged.amb) params.set("amb", merged.amb);
  const qs = params.toString();
  return qs ? `/buscar?${qs}` : "/buscar";
}

export default async function BuscarPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const profiles = await getUserSearchProfiles();
  if (profiles.length === 0) {
    redirect("/onboarding");
  }

  const activeProfile = sp.profile
    ? (await getSearchProfileById(sp.profile)) ?? profiles.find((p) => p.is_primary) ?? profiles[0]
    : profiles.find((p) => p.is_primary) ?? profiles[0];

  const filters: MatchedPropertyFilters = {
    propertyType: sp.tipo,
    priceMax: parseOptionalInt(sp.precio_max),
    roomsMin: parseOptionalInt(sp.amb),
  };

  const [matched, favoritedIds] = await Promise.all([
    getMatchedProperties(activeProfile, filters),
    getFavoritedPropertyIds(userId),
  ]);

  const hasAnyFilter = filters.propertyType || filters.priceMax !== undefined || filters.roomsMin !== undefined;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Buscar</h1>
        <p className="text-sm text-muted-foreground">
          Matches para tu búsqueda{" "}
          <span className="font-medium text-foreground">{activeProfile.name}</span>
          {activeProfile.is_primary && " (primaria)"}.
          Ordenados de mejor a peor encaje. Las que no encajan no aparecen.
        </p>
      </header>

      {/* Profile toggle (only when the user has more than one). */}
      {profiles.length > 1 && (
        <nav className="flex items-center gap-2 flex-wrap" aria-label="Cambiar búsqueda">
          {profiles.map((p) => {
            const active = p.id === activeProfile.id;
            return (
              <Link
                key={p.id}
                href={buildHref({ profile: p.id }, {})}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-muted",
                )}
              >
                {p.name}
                {p.is_primary && active && " ★"}
              </Link>
            );
          })}
        </nav>
      )}

      {/* Filter chips */}
      <section className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Estrechá la búsqueda
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Tipo */}
          {activeProfile.property_types.map((t) => {
            const active = filters.propertyType === t;
            return (
              <Link
                key={t}
                href={buildHref(sp, { tipo: active ? null : t })}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs transition-colors",
                  active ? "bg-foreground text-background" : "hover:bg-muted",
                )}
              >
                {TYPE_LABELS[t] ?? t}
              </Link>
            );
          })}

          {/* Ambientes preset */}
          {[2, 3, 4].map((a) => {
            const active = filters.roomsMin === a;
            return (
              <Link
                key={`amb-${a}`}
                href={buildHref(sp, { amb: active ? null : String(a) })}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs transition-colors",
                  active ? "bg-foreground text-background" : "hover:bg-muted",
                )}
              >
                {a}+ amb
              </Link>
            );
          })}

          {hasAnyFilter && (
            <Link
              href={buildHref({ profile: sp.profile }, { tipo: null, precio_max: null, amb: null })}
              className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline ml-1"
            >
              Limpiar filtros
            </Link>
          )}
        </div>
      </section>

      {/* Results */}
      {matched.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="size-4" />
              Sin matches para esta búsqueda
            </CardTitle>
            <CardDescription>
              {hasAnyFilter
                ? "Probá limpiar los filtros o ajustá tu perfil."
                : "Ajustá tu búsqueda — quizás está muy estrecha."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href={`/busquedas/${activeProfile.id}/editar`}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Editar búsqueda
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {matched.length}{" "}
              {matched.length === 1 ? "propiedad" : "propiedades"}
            </span>
            <Badge variant="secondary" className="font-normal">
              Ordenadas por match
            </Badge>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {matched.map(({ property, match }) => (
              <li key={property.id}>
                <PropertyCard
                  property={{
                    id: property.id,
                    property_type: property.property_type,
                    partido: property.partido,
                    address: property.address,
                    price_amount: property.price_amount,
                    price_currency: property.price_currency,
                    rooms: property.rooms,
                    surface_total: property.surface_total,
                    surface_arba: property.surface_arba,
                    photos: property.photos,
                  }}
                  qualityBreakdown={property.quality_score_breakdown}
                  matchBreakdown={match}
                  isFavorited={favoritedIds.has(property.id)}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
