import Link from "next/link";
import { getPropertiesAdmin, getDistinctPartidos } from "@/lib/db/admin";
import { Badge } from "@/components/ui/badge";
import { PropertiesFilters } from "./properties-filters";
import { Pagination } from "@/components/shared/pagination";

export const metadata = {
  title: "Propiedades — Admin Jotaeme",
};

interface PageProps {
  searchParams: Promise<{
    search?: string;
    partido?: string;
    propertyType?: string;
    status?: string;
    page?: string;
  }>;
}

function formatPrice(amount: number | null, currency: string | null) {
  if (amount == null || !currency) return "—";
  return `${currency} ${amount.toLocaleString("es-AR")}`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR");
}

export default async function AdminPropertiesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page, 10) : 1;
  const status =
    params.status === "active" || params.status === "inactive"
      ? params.status
      : "all";

  const [result, partidos] = await Promise.all([
    getPropertiesAdmin({
      search: params.search,
      partido: params.partido,
      propertyType: params.propertyType,
      status,
      page,
      pageSize: 25,
    }),
    getDistinctPartidos(),
  ]);

  return (
    <div className="px-6 py-8 space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Propiedades</h1>
        <p className="text-muted-foreground mt-1">
          {result.total.toLocaleString("es-AR")} propiedades en la base.
        </p>
      </header>

      <PropertiesFilters partidos={partidos} />

      <div className="border rounded-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="border-b">
              <th className="text-left font-medium p-3">Dirección</th>
              <th className="text-left font-medium p-3">Partido</th>
              <th className="text-left font-medium p-3">Tipo</th>
              <th className="text-right font-medium p-3">Precio</th>
              <th className="text-right font-medium p-3">m²</th>
              <th className="text-center font-medium p-3">Score</th>
              <th className="text-center font-medium p-3">Estado</th>
              <th className="text-left font-medium p-3">Último visto</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="p-8 text-center text-muted-foreground"
                >
                  Sin propiedades que coincidan con esos filtros.
                </td>
              </tr>
            ) : (
              result.rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b hover:bg-muted/30 transition-colors"
                >
                  <td className="p-3">
                    <Link
                      href={`/admin/properties/${row.id}`}
                      className="font-medium text-foreground hover:underline underline-offset-2"
                    >
                      {row.address ?? "(sin dirección)"}
                    </Link>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {row.partido ?? "—"}
                  </td>
                  <td className="p-3 text-muted-foreground capitalize">
                    {row.property_type ?? "—"}
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    {formatPrice(row.price_amount, row.price_currency)}
                  </td>
                  <td className="p-3 text-right text-muted-foreground tabular-nums">
                    {row.surface_total ?? "—"}
                  </td>
                  <td className="p-3 text-center text-muted-foreground tabular-nums">
                    {row.quality_score ?? "—"}
                  </td>
                  <td className="p-3 text-center">
                    {row.is_active ? (
                      <Badge variant="default">Activa</Badge>
                    ) : (
                      <Badge variant="secondary">Inactiva</Badge>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {formatDate(row.last_seen_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        total={result.total}
        pageSize={result.pageSize}
      />
    </div>
  );
}
