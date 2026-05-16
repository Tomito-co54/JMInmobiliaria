import { getCurrentUser } from "@/lib/db/users";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Dashboard — Jotaeme",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Hola{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-muted-foreground mt-1">
          Bienvenido a Jotaeme. Acá vas a ver tus búsquedas, propiedades
          guardadas y alertas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">En construcción</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Estamos armando la plataforma. Próximamente vas a poder buscar
            propiedades, crear perfiles de búsqueda, recibir alertas y
            contratar informes verificados.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
