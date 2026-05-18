import { CheckCircle2 } from "lucide-react";
import { getServiceOrderById } from "@/lib/db/service-orders";
import { PaymentReturnLayout } from "@/components/payment/PaymentReturnLayout";

/**
 * MercadoPago return URL for `approved` payments.
 *
 * The page itself is informational — the webhook is the source of truth
 * for marking the order as paid + kicking off fulfillment. We just show
 * the buyer that their card went through and tell them what to expect.
 *
 * order_id may or may not be present (MP's auto_return can drop query
 * params depending on the device). We handle both.
 */
export const dynamic = "force-dynamic";
export const metadata = { title: "Pago confirmado — Jotaeme" };

interface PageProps {
  searchParams: Promise<{ order_id?: string }>;
}

export default async function PagoExitoPage({ searchParams }: PageProps) {
  const { order_id } = await searchParams;

  const order = order_id
    ? await getServiceOrderById(order_id, { admin: true })
    : null;

  const propertyId = order?.property_id ?? null;
  const isDelivered = order?.status === "delivered";

  return (
    <PaymentReturnLayout
      icon={
        <CheckCircle2
          className="size-9"
          style={{ color: "var(--brand-gold)" }}
          aria-hidden="true"
        />
      }
      title={isDelivered ? "¡Tu informe está listo!" : "¡Pago confirmado!"}
      description={
        isDelivered
          ? "Ya podés descargar el PDF desde tus servicios o desde el email que te enviamos."
          : "Estamos generando tu informe. Te avisamos por email apenas esté listo — suele tardar menos de un minuto."
      }
      propertyId={propertyId}
    />
  );
}
