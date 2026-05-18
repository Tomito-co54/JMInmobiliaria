import Link from "next/link";
import { redirect } from "next/navigation";
import { Pencil, Plus, Settings, Star } from "lucide-react";
import { getCurrentUser } from "@/lib/db/users";
import {
  FREE_TIER_PROFILE_LIMIT,
  getUserSearchProfiles,
} from "@/lib/db/search-profiles";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Dashboard — landing for authenticated users.
 *
 * Acts as the post-login dispatcher (B5.6): if the user has no search
 * profiles yet, we redirect them to /onboarding. Otherwise we show a
 * summary of their primary profile + quick actions.
 *
 * Block 6 will add the list of matching properties + alerts under this
 * shell. For now the second half is intentionally minimal so the user
 * sees real value (their búsqueda) instead of more "en construcción".
 */

export const metadata = {
  title: "Inicio — Jotaeme",
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
  if (preferred.length > 0) return preferred.join(", ");
  return zones.map((z) => z.partido).join(", ");
}

function summarizePrice(profile: {
  price_min: number | null;
  price_max: number | null;
  price_currency: "USD" | "ARS";
}): string {
  if (profile.price_min === null && profile.price_max === null) return "Sin rango";
  const c = profile.price_currency;
  const fmt = (n: number) => new Intl.NumberFormat("es-AR").format(n);
  if (profile.price_min !== null && profile.price_max !== null) {
    return `${c} ${fmt(profile.price_min)} – ${fmt(profile.price_max)}`;
  }
  if (profile.price_max !== null) return `Hasta ${c} ${fmt(profile.price_max)}`;
  return `Desde ${c} ${fmt(profile.price_min!)}`;
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const profiles = await getUserSearchProfiles();

  // Post-register / no-profile dispatch (B5.6). The onboarding page itself
  // also defends against this by redirecting back to /dashboard if a profile
  // exists — so the two routes ping-pong cleanly without cycling.
  if (profiles.length === 0) {
    redirect("/onboarding");
  }

  const primary = profiles.find((p) => p.is_primary) ?? profiles[0];
  const others = profiles.filter((p) => p.id !== primary.id);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          Hola{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Acá vas a ver tus búsquedas, los matches que aparezcan y las alertas
          (en construcción para próximos bloques).
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2 flex-wrap">
              {primary.name}
              <Badge className="gap-1">
                <Star className="size-3 fill-current" />
                Primaria
              </Badge>
            </CardTitle>
            <CardDescription>
              {summarizePrice(primary)} ·{" "}
              {primary.property_types.length > 0
                ? primary.property_types.map((t) => TYPE_LABELS[t] ?? t).join(", ")
                : "Cualquier tipo"}
              {primary.operation_type ? ` · ${primary.operation_type}` : ""}
            </CardDescription>
          </div>
          <Link
            href={`/busquedas/${primary.id}/editar`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Pencil className="size-3.5" />
            Editar
          </Link>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Zonas:</span>{" "}
            {summarizeZones(primary.zones)}
          </p>
          {(primary.rooms_min !== null || primary.surface_min !== null) && (
            <p>
              <span className="font-medium text-foreground">Mínimos:</span>{" "}
              {primary.rooms_min !== null && (
                <>
                  {primary.rooms_min} amb
                  {primary.surface_min !== null && " · "}
                </>
              )}
              {primary.surface_min !== null && <>{primary.surface_min}m²</>}
            </p>
          )}
          {primary.must_haves.length > 0 && (
            <p>
              <span className="font-medium text-foreground">No-negociables:</span>{" "}
              {primary.must_haves.join(", ")}
            </p>
          )}
        </CardContent>
      </Card>

      {others.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground">
            Otras búsquedas
          </h2>
          <ul className="space-y-3">
            {others.map((p) => (
              <li key={p.id}>
                <Card>
                  <CardHeader className="flex flex-row items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm">{p.name}</CardTitle>
                      <CardDescription className="mt-0.5 text-xs">
                        {summarizePrice(p)} ·{" "}
                        {p.property_types.length > 0
                          ? p.property_types.map((t) => TYPE_LABELS[t] ?? t).join(", ")
                          : "Cualquier tipo"}
                      </CardDescription>
                    </div>
                    <Link
                      href={`/busquedas/${p.id}/editar`}
                      className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                    >
                      <Pencil className="size-3.5" />
                    </Link>
                  </CardHeader>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href="/busquedas"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          <Settings className="size-3.5" />
          Administrar búsquedas
        </Link>
        {profiles.length < FREE_TIER_PROFILE_LIMIT && (
          <Link
            href="/busquedas/nueva"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            <Plus className="size-3.5" />
            Nueva búsqueda
          </Link>
        )}
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Próximamente</CardTitle>
          <CardDescription>
            Bloque 6 va a traer la lista de propiedades que matchean tus
            búsquedas, alertas por email cuando aparezcan nuevas, y favoritos
            guardados. Bloque 7 los servicios pagos (informe de dominio,
            cédula catastral, etc.).
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
