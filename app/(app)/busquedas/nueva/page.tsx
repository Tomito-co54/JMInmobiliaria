import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import {
  getUserSearchProfiles,
  FREE_TIER_PROFILE_LIMIT,
} from "@/lib/db/search-profiles";
import { SearchProfileForm } from "@/components/search-profile/SearchProfileForm";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createBusquedaAction } from "../actions";

export const metadata = {
  title: "Nueva búsqueda — Jotaeme",
};

export default async function NuevaBusquedaPage() {
  const existing = await getUserSearchProfiles();
  if (existing.length >= FREE_TIER_PROFILE_LIMIT) {
    redirect("/busquedas");
  }

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
        <h1 className="text-2xl font-bold tracking-tight">Nueva búsqueda</h1>
        <p className="text-sm text-muted-foreground">
          {existing.length + 1}/{FREE_TIER_PROFILE_LIMIT} —{" "}
          {existing.length === 0
            ? "es tu primera"
            : "vas a poder usarla en paralelo con la otra"}
          .
        </p>
      </div>

      <SearchProfileForm
        action={createBusquedaAction}
        submitLabel="Crear búsqueda"
        cancelHref="/busquedas"
      />
    </div>
  );
}
