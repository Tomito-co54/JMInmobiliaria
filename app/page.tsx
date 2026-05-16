import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-4 py-4 border-b">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-lg font-semibold tracking-tight">Jotaeme</span>
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

      <section className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-2xl text-center space-y-6">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Comprá tu propiedad con información{" "}
            <span className="text-primary">verificada</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Datos catastrales cruzados con ARBA, scoring transparente de cada
            propiedad y servicios automatizados para que decidas con seguridad.
          </p>
          <p className="text-sm text-muted-foreground">
            Zona Sur GBA: Lomas, Banfield, Lanús, Avellaneda, Quilmes.
          </p>
          {!user && (
            <div className="pt-4">
              <Link href="/register" className={buttonVariants({ size: "lg" })}>
                Empezar gratis
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
