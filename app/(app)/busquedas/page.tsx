import Link from "next/link";
import { Plus, Star, Pencil, Trash2 } from "lucide-react";
import {
  getUserSearchProfiles,
  FREE_TIER_PROFILE_LIMIT,
} from "@/lib/db/search-profiles";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  deleteBusquedaAction,
  setPrimaryBusquedaAction,
} from "./actions";

/**
 * Búsquedas — list of the user's search profiles.
 *
 * Up to FREE_TIER_PROFILE_LIMIT (2) profiles. When the limit is reached
 * the "Nueva búsqueda" button is disabled with a hint.
 */

export const metadata = {
  title: "Mis búsquedas — Jotaeme",
};

const TYPE_LABELS: Record<string, string> = {
  casa: "Casa",
  departamento: "Depto",
  ph: "PH",
  lote: "Lote",
  local: "Local",
};

function summarizeZones(zones: { partido: string; priority: string }[]): string {
  if (zones.length === 0) return "Sin zonas marcadas";
  const preferred = zones.filter((z) => z.priority === "preferido").map((z) => z.partido);
  const acceptable = zones.filter((z) => z.priority === "aceptable").map((z) => z.partido);
  const parts: string[] = [];
  if (preferred.length > 0) parts.push(`Preferidas: ${preferred.join(", ")}`);
  if (acceptable.length > 0) parts.push(`Aceptables: ${acceptable.join(", ")}`);
  return parts.join(" · ");
}

function summarizePrice(profile: {
  price_min: number | null;
  price_max: number | null;
  price_currency: "USD" | "ARS";
}): string {
  if (profile.price_min === null && profile.price_max === null) return "Sin rango de precio";
  const c = profile.price_currency;
  const fmt = (n: number) => new Intl.NumberFormat("es-AR").format(n);
  if (profile.price_min !== null && profile.price_max !== null) {
    return `${c} ${fmt(profile.price_min)} – ${fmt(profile.price_max)}`;
  }
  if (profile.price_max !== null) return `Hasta ${c} ${fmt(profile.price_max)}`;
  return `Desde ${c} ${fmt(profile.price_min!)}`;
}

export default async function BusquedasPage() {
  const profiles = await getUserSearchProfiles();
  const reachedLimit = profiles.length >= FREE_TIER_PROFILE_LIMIT;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mis búsquedas</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Cada búsqueda define qué propiedades te van a aparecer como match. Tenés{" "}
            {profiles.length}/{FREE_TIER_PROFILE_LIMIT} usadas.
          </p>
        </div>
        <Link
          href="/busquedas/nueva"
          aria-disabled={reachedLimit}
          className={cn(
            buttonVariants({ size: "sm" }),
            reachedLimit && "pointer-events-none opacity-50",
          )}
          title={
            reachedLimit
              ? "Llegaste al máximo. Eliminá una para crear otra."
              : "Crear una nueva búsqueda"
          }
        >
          <Plus className="size-4" />
          Nueva búsqueda
        </Link>
      </header>

      {profiles.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Todavía no tenés búsquedas armadas.
            </p>
            <Link href="/onboarding" className={buttonVariants({ size: "sm" })}>
              Armar mi primera búsqueda
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-4">
          {profiles.map((p) => (
            <li key={p.id}>
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                      <span>{p.name}</span>
                      {p.is_primary && (
                        <Badge className="gap-1">
                          <Star className="size-3 fill-current" />
                          Primaria
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {summarizePrice(p)} ·{" "}
                      {p.property_types.length > 0
                        ? p.property_types.map((t) => TYPE_LABELS[t] ?? t).join(", ")
                        : "Cualquier tipo"}
                      {p.operation_type ? ` · ${p.operation_type}` : ""}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-muted-foreground">{summarizeZones(p.zones)}</p>
                  {(p.rooms_min !== null || p.surface_min !== null) && (
                    <p className="text-muted-foreground">
                      {p.rooms_min !== null && (
                        <>
                          Mínimo {p.rooms_min} amb
                          {p.surface_min !== null && " · "}
                        </>
                      )}
                      {p.surface_min !== null && <>Mínimo {p.surface_min}m²</>}
                    </p>
                  )}
                  {p.must_haves.length > 0 && (
                    <p className="text-muted-foreground">
                      No-negociables: {p.must_haves.join(", ")}
                    </p>
                  )}
                  <div className="flex items-center gap-2 pt-2 flex-wrap">
                    <Link
                      href={`/busquedas/${p.id}/editar`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      <Pencil className="size-3.5" />
                      Editar
                    </Link>
                    {!p.is_primary && (
                      <form
                        action={async () => {
                          "use server";
                          await setPrimaryBusquedaAction(p.id);
                        }}
                      >
                        <Button type="submit" variant="ghost" size="sm">
                          <Star className="size-3.5" />
                          Marcar primaria
                        </Button>
                      </form>
                    )}
                    <form
                      action={async () => {
                        "use server";
                        await deleteBusquedaAction(p.id);
                      }}
                      className="ml-auto"
                    >
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                        Eliminar
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
