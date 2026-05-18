import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getSearchProfileById } from "@/lib/db/search-profiles";
import { SearchProfileForm } from "@/components/search-profile/SearchProfileForm";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { updateBusquedaAction } from "../../actions";
import type { KnownMustHave } from "@/lib/matching";
import type { PartidoZonaSur } from "@/lib/zona-sur/partidos";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Editar búsqueda — Jotaeme",
};

export default async function EditarBusquedaPage({ params }: PageProps) {
  const { id } = await params;
  const profile = await getSearchProfileById(id);
  if (!profile) notFound();

  const updateBound = updateBusquedaAction.bind(null, id);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <Link
        href="/busquedas"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2")}
      >
        <ChevronLeft className="size-4" />
        Mis búsquedas
      </Link>

      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight">Editar búsqueda</h1>
        <p className="text-sm text-muted-foreground">
          Editás <span className="font-medium text-foreground">{profile.name}</span>
          {profile.is_primary && " (primaria)"}.
        </p>
      </div>

      <SearchProfileForm
        action={updateBound}
        submitLabel="Guardar cambios"
        cancelHref="/busquedas"
        initialValues={{
          name: profile.name,
          zones: profile.zones.map((z) => ({
            partido: z.partido as PartidoZonaSur,
            priority: z.priority,
          })),
          operation_type: profile.operation_type,
          property_types: profile.property_types.filter(
            (t): t is "casa" | "departamento" | "ph" | "lote" | "local" =>
              ["casa", "departamento", "ph", "lote", "local"].includes(t),
          ),
          price_currency: profile.price_currency,
          price_min: profile.price_min,
          price_max: profile.price_max,
          rooms_min: profile.rooms_min,
          surface_min: profile.surface_min,
          must_haves: profile.must_haves.filter((m): m is KnownMustHave =>
            (
              [
                "cochera",
                "patio",
                "balcon",
                "parrilla",
                "pileta",
                "terraza",
                "jardin",
                "ascensor",
                "amenities",
                "seguridad",
              ] as const
            ).includes(m as KnownMustHave),
          ),
        }}
      />
    </div>
  );
}
