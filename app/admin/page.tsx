import { getDashboardMetrics } from "@/lib/db/admin";
import { MetricCard } from "@/components/shared/metric-card";

export const metadata = {
  title: "Dashboard admin — Jotaeme",
};

// Recompute every minute (metrics don't need real-time precision)
export const revalidate = 60;

export default async function AdminDashboardPage() {
  const metrics = await getDashboardMetrics();

  return (
    <div className="px-6 py-8 space-y-6 max-w-6xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Métricas generales del sistema.
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          label="Propiedades activas"
          value={metrics.properties.active.toLocaleString("es-AR")}
          hint={`${metrics.properties.total.toLocaleString("es-AR")} totales (${metrics.properties.inactive.toLocaleString("es-AR")} inactivas)`}
        />
        <MetricCard
          label="Usuarios registrados"
          value={metrics.usersTotal.toLocaleString("es-AR")}
        />
        <MetricCard
          label="Favoritos creados"
          value={metrics.favoritesLast30Days.toLocaleString("es-AR")}
          hint="Últimos 30 días"
        />
        <MetricCard
          label="Servicios contratados"
          value={metrics.serviceOrdersLast30Days.toLocaleString("es-AR")}
          hint="Últimos 30 días"
        />
      </section>

      <section className="rounded-md border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">
          Las métricas se recalculan cada minuto. Para ver detalles de
          propiedades o usuarios usá las secciones del menú lateral.
        </p>
      </section>
    </div>
  );
}
