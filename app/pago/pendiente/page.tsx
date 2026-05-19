import { Clock } from "lucide-react";
import { getServiceOrderById } from "@/lib/db/service-orders";
import { PaymentReturnLayout } from "@/components/payment/PaymentReturnLayout";

/**
 * MercadoPago return URL for `pending` payments — typical for bank
 * transfers, Rapipago / Pago Fácil tickets, etc.
 */
export const dynamic = "force-dynamic";
export const metadata = { title: "Pago en proceso — Jotaeme" };

interface PageProps {
  searchParams: Promise<{ order_id?: string }>;
}

export default async function PagoPendientePage({ searchParams }: PageProps) {
  const { order_id } = await searchParams;
  const order = order_id
    ? await getServiceOrderById(order_id, { admin: true })
    : null;

  return (
    <PaymentReturnLayout
      icon={
        <Clock
          className="size-9"
          style={{ color: "var(--brand-heading)" }}
          aria-hidden="true"
        />
      }
      title="Tu pago está en proceso"
      description="MercadoPago todavía está procesando el cobro (es normal en transferencias o pagos en efectivo). Cuando se confirme generamos tu informe automáticamente y te avisamos por email."
      propertyId={order?.property_id ?? null}
    />
  );
}
