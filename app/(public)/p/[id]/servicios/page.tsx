import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, ShieldCheck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { ServiceCard } from "@/components/services/ServiceCard";
import { listAvailableServices } from "@/lib/services/catalog";
import { getPropertyForPublicView } from "@/lib/db/properties";
import { getCurrentUserId } from "@/lib/db/users";
import { cn } from "@/lib/utils";

/**
 * Service catalog for a specific property. Buyer enters from the
 * property page's "Servicios" CTA.
 *
 * Server Component — the catalog is static (no per-request data except
 * the property reminder). Each <ServiceCard> is a Client Component that
 * fires the order-creation server action and redirects to MercadoPago.
 *
 * Login gating happens inside ServiceCard (so anonymous users still see
 * the catalog and pricing — friction-free preview, gate only on intent).
 */

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const view = await getPropertyForPublicView(id);
  if (!view) return { title: "Servicios — Jotaeme" };
  const title = view.property.address
    ? `Servicios para ${view.property.address} — Jotaeme`
    : "Servicios — Jotaeme";
  return { title };
}

export default async function ServiceCatalogPage({ params }: PageProps) {
  const { id } = await params;
  const view = await getPropertyForPublicView(id);
  if (!view) notFound();
  const { property } = view;

  const services = listAvailableServices();
  const userId = await getCurrentUserId();

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
          <Link
            href={`/p/${property.id}`}
            aria-label="Volver a la propiedad"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "-ml-2 gap-1.5",
            )}
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Volver</span>
          </Link>

          <Link
            href="/"
            aria-label="Jotaeme — Oportunidades Inmobiliarias"
            className="shrink-0"
          >
            <BrandLogo variant="isotipo" size={28} />
          </Link>

          <div className="w-[60px]" />
        </div>
      </header>

      <section className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Property reminder */}
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            Servicios para
          </p>
          <p className="font-medium text-foreground mt-1 leading-snug">
            {property.address ?? "Propiedad sin dirección"}
          </p>
          {property.partido && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="size-3" />
              {property.partido}
            </p>
          )}
        </div>

        {/* Intro */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold font-heading" style={{ color: "var(--brand-navy)" }}>
            Servicios disponibles
          </h1>
          <p className="text-sm text-muted-foreground">
            Informes oficiales y verificaciones para tomar una decisión informada
            sobre esta propiedad.
          </p>
        </div>

        {/* Trust signal */}
        <div
          className="flex items-start gap-3 rounded-lg p-3"
          style={{ backgroundColor: "rgba(212, 162, 76, 0.10)" }}
        >
          <ShieldCheck className="size-5 shrink-0 mt-0.5" style={{ color: "var(--brand-gold)" }} />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Pago seguro con MercadoPago</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Procesamos el cobro a través de MercadoPago, que valida y guarda los
              datos de pago. Recibís el informe por email apenas se confirme la
              transacción.
            </p>
          </div>
        </div>

        {/* Catalog */}
        <div className="space-y-3">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              propertyId={property.id}
              signedIn={!!userId}
            />
          ))}
        </div>

        {/* Footer note */}
        <p className="text-xs text-muted-foreground leading-relaxed pt-2">
          Próximamente: Informe de Dominio (RPI), Certificado Catastral para
          escrituración, Tasación Formal con firma de matriculado, y paquete
          Compra Segura.
        </p>
      </section>
    </main>
  );
}
