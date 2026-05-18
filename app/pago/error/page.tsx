import Link from "next/link";
import { XCircle } from "lucide-react";
import { getServiceOrderById } from "@/lib/db/service-orders";
import { PaymentReturnLayout } from "@/components/payment/PaymentReturnLayout";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * MercadoPago return URL for `failure` / `rejected` payments. Common
 * causes: card declined, insufficient funds, fraud rules, user canceled.
 */
export const dynamic = "force-dynamic";
export const metadata = { title: "El pago no se completó — Jotaeme" };

interface PageProps {
  searchParams: Promise<{ order_id?: string }>;
}

export default async function PagoErrorPage({ searchParams }: PageProps) {
  const { order_id } = await searchParams;
  const order = order_id
    ? await getServiceOrderById(order_id, { admin: true })
    : null;
  const propertyId = order?.property_id ?? null;

  return (
    <PaymentReturnLayout
      icon={
        <XCircle
          className="size-9 text-destructive"
          aria-hidden="true"
        />
      }
      title="El pago no se completó"
      description="MercadoPago no pudo procesar el cobro. Puede ser por saldo insuficiente, tarjeta rechazada o cancelación. No se realizó ningún cargo y podés intentar de nuevo cuando quieras."
      propertyId={propertyId}
    >
      {propertyId && (
        <Link
          href={`/p/${propertyId}/servicios`}
          className={cn(buttonVariants({ variant: "outline" }), "w-full")}
        >
          Volver a intentar
        </Link>
      )}
    </PaymentReturnLayout>
  );
}
