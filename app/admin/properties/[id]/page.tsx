import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { getPropertyDetailAdmin } from "@/lib/db/admin";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Detalle propiedad — Admin Jotaeme",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

function fmt(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

export default async function AdminPropertyDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { property, history } = await getPropertyDetailAdmin(id);

  if (!property) {
    notFound();
  }

  // Order fields meaningfully for display
  const ORDERED_FIELDS = [
    "id",
    "external_id",
    "source",
    "url",
    "is_active",
    "address",
    "partido",
    "partida",
    "nomenclatura_catastral",
    "lat",
    "lng",
    "property_type",
    "operation_type",
    "price_amount",
    "price_currency",
    "surface_total",
    "surface_covered",
    "surface_arba",
    "has_surface_discrepancy",
    "rooms",
    "bedrooms",
    "bathrooms",
    "garages",
    "description",
    "photos",
    "quality_score",
    "quality_score_breakdown",
    "first_seen_at",
    "last_seen_at",
    "created_at",
    "updated_at",
  ] as const;

  return (
    <div className="px-6 py-8 space-y-6 max-w-5xl">
      <div>
        <Link
          href="/admin/properties"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2",
          )}
        >
          <ChevronLeft className="size-3.5" />
          Volver a propiedades
        </Link>
      </div>

      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {property.address ?? "(sin dirección)"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {property.partido ?? "—"} · {property.property_type ?? "—"} ·{" "}
            {property.operation_type ?? "—"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {property.is_active ? (
              <Badge>Activa</Badge>
            ) : (
              <Badge variant="secondary">Inactiva</Badge>
            )}
            {property.quality_score != null && (
              <Badge variant="outline">
                Score {property.quality_score}
              </Badge>
            )}
            {property.has_surface_discrepancy && (
              <Badge variant="destructive">Discrepancia ARBA</Badge>
            )}
          </div>
        </div>
        {property.url && (
          <a
            href={property.url}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <ExternalLink className="size-3.5" />
            Ver listado original
          </a>
        )}
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos crudos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y text-sm">
            {ORDERED_FIELDS.map((field) => {
              const value = (property as Record<string, unknown>)[field];
              const isJson =
                field === "photos" || field === "quality_score_breakdown";
              return (
                <div
                  key={field}
                  className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-1 sm:gap-3 px-4 py-2"
                >
                  <span className="font-mono text-xs text-muted-foreground">
                    {field}
                  </span>
                  {isJson ? (
                    <pre className="text-xs bg-muted/40 rounded p-2 overflow-x-auto whitespace-pre-wrap break-words">
                      {fmt(value)}
                    </pre>
                  ) : (
                    <span className="break-words">{fmt(value)}</span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Historial de cambios ({history.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 py-6 text-center">
              Sin cambios registrados.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="text-left font-medium p-3">Fecha</th>
                  <th className="text-left font-medium p-3">Campo</th>
                  <th className="text-left font-medium p-3">Antes</th>
                  <th className="text-left font-medium p-3">Después</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b">
                    <td className="p-3 text-muted-foreground tabular-nums">
                      {new Date(h.changed_at).toLocaleString("es-AR")}
                    </td>
                    <td className="p-3 font-mono text-xs">{h.field_changed}</td>
                    <td className="p-3 text-muted-foreground">
                      {fmt(h.old_value)}
                    </td>
                    <td className="p-3">{fmt(h.new_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
