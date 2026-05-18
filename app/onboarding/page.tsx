import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/db/users";
import { getUserSearchProfiles } from "@/lib/db/search-profiles";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { SearchProfileForm } from "@/components/search-profile/SearchProfileForm";
import { createOnboardingProfile } from "./actions";

/**
 * Onboarding — first-run setup of a search profile.
 *
 * Reached automatically after a fresh registration (B5.6 dispatches the
 * redirect). If the user already has at least one profile, we bounce them
 * to /dashboard rather than letting them create a duplicate via this flow.
 * Additional profiles get created from /busquedas/nueva.
 */

export const metadata = {
  title: "Armá tu búsqueda — Jotaeme",
};

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const existing = await getUserSearchProfiles();
  if (existing.length > 0) {
    redirect("/dashboard");
  }

  const firstName = user.full_name?.split(" ")[0] ?? null;

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            aria-label="Jotaeme — inicio"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <BrandLogo variant="isotipo" size={28} />
            <span className="text-base font-semibold tracking-tight">Jotaeme</span>
          </Link>
          <span className="text-xs text-muted-foreground">Paso 1 de 1</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {firstName ? `Hola ${firstName}, ` : ""}armemos tu búsqueda
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Esto nos sirve para mostrarte qué propiedades te encajan y avisarte cuando aparezca
            una nueva. Te lleva 1 minuto y lo podés editar cuando quieras.
          </p>
        </div>

        <SearchProfileForm
          action={createOnboardingProfile}
          submitLabel="Guardar y empezar"
        />
      </div>
    </main>
  );
}
