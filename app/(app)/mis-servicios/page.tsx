import Link from "next/link";
import {
  FileText,
  Clock,
  CircleCheck,
  CircleX,
  Loader2,
  Download,
} from "lucide-react";
import { getCurrentUserId } from "@/lib/db/users";
import { getUserServiceOrders } from "@/lib/db/service-orders";
import { getServiceDefinition } from "@/lib/services/catalog";
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
 * /mis-servicios — list of the current user's service orders.
 *
 * Shows the status pill, service title, property address, folio, and a
 * download button when the deliverable is ready. Orders in pending_payment
 * have a "Reintentar pago" link in case the user dropped the MP checkout.
 */

export const metadata = { title: "Mis servicios — Jotaeme" };
export const dynamic = "force-dynamic";

const STATUS_LABEL = {
  pending_payment: "Pago pendiente",
  paid: "Pago confirmado",
  processing: "Generando informe",
  delivered: "Listo para descargar",
  refunded: "Reintegrado",
} as const;

const STATUS_ICON = {
  pending_payment: Clock,
  paid: CircleCheck,
  processing: Loader2,
  delivered: CircleCheck,
  refunded: CircleX,
} as const;

const STATUS_TONE = {
  pending_payment: "secondary",
  paid: "default",
  processing: "default",
  delivered: "default",
  refunded: "destructive",
} as const;

function fmtPrice(amount: number, currency: string): string {
  return `${currency} ${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(amount)}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function MisServiciosPage() {
  const userId = await getCurrentUserId();
  if (!userId) return null; // (app) layout already redirects

  const orders = await getUserServiceOrders(userId);

  if (orders.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Mis servicios</h1>
        </header>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4" />
              Todavía no contrataste servicios
            </CardTitle>
            <CardDescription>
              Cuando contrates un informe (catastral, de dominio, tasación) lo vas
              a ver acá con su estado y un link para descargarlo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/buscar" className={cn(buttonVariants({ size: "sm" }))}>
              Explorar propiedades
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Mis servicios</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {orders.length}{" "}
          {orders.length === 1 ? "informe contratado" : "informes contratados"}.
        </p>
      </header>

      <ul className="space-y-3">
        {orders.map((order) => {
          const service = getServiceDefinition(order.service_type);
          const Icon = STATUS_ICON[order.status] ?? Clock;
          const tone = STATUS_TONE[order.status] ?? "secondary";
          const propAddress = (
            order as unknown as {
              properties: { address: string | null; partido: string | null } | null;
            }
          ).properties?.address;
          const propPartido = (
            order as unknown as {
              properties: { address: string | null; partido: string | null } | null;
            }
          ).properties?.partido;
          const folio = order.id.split("-")[0].toUpperCase();

          return (
            <li key={order.id} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-medium text-foreground leading-tight">
                      {service.title}
                    </h2>
                    <Badge variant={tone} className="gap-1">
                      <Icon
                        className={cn(
                          "size-3",
                          order.status === "processing" && "animate-spin",
                        )}
                      />
                      {STATUS_LABEL[order.status]}
                    </Badge>
                  </div>
                  {propAddress && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {propAddress}
                      {propPartido ? `, ${propPartido}` : ""}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Folio <span className="font-mono">{folio}</span> · {fmtDate(order.created_at)} ·{" "}
                    {fmtPrice(order.price, order.currency)}
                  </p>
                </div>
              </div>

              {order.status === "delivered" && order.result_file_url && (
                <a
                  href={order.result_file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "gap-2 w-full sm:w-auto",
                  )}
                >
                  <Download className="size-4" />
                  Descargar PDF
                </a>
              )}

              {order.status === "pending_payment" && order.mp_preference_id && (
                <p className="text-xs text-muted-foreground">
                  Si dejaste el pago a la mitad, podés{" "}
                  <Link
                    href={`/p/${order.property_id}/servicios`}
                    className="underline hover:no-underline"
                    style={{ color: "var(--brand-navy)" }}
                  >
                    contratar de nuevo
                  </Link>
                  .
                </p>
              )}

              {order.status === "processing" && (
                <p className="text-xs text-muted-foreground">
                  Estamos generando tu informe. Te avisamos por email apenas esté listo
                  (suele tardar menos de un minuto).
                </p>
              )}

              {order.status === "refunded" && (
                <p className="text-xs text-muted-foreground">
                  Se realizó el reintegro. Si tenés dudas, escribinos.
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
