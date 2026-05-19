import Link from "next/link";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Shared chrome for the three /pago/* return URLs that MercadoPago
 * redirects to after the buyer leaves the checkout.
 *
 * Mobile-first: a single centered card with brand header, icon, status
 * title, body, and two CTAs ("Mis servicios" + "Volver a la propiedad"
 * when a propertyId is provided).
 */
interface PaymentReturnLayoutProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
  /** When provided, renders a "Volver a la propiedad" link. */
  propertyId?: string | null;
}

export function PaymentReturnLayout({
  icon,
  title,
  description,
  children,
  propertyId,
}: PaymentReturnLayoutProps) {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <Link
            href="/"
            aria-label="Jotaeme — ir al inicio"
            className="inline-flex items-center gap-2"
          >
            <BrandLogo variant="isotipo" size={28} />
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <article className="max-w-md w-full rounded-lg border bg-card p-6 sm:p-8 space-y-5 text-center">
          <div className="mx-auto size-16 rounded-full grid place-items-center bg-muted/60">
            {icon}
          </div>
          <div className="space-y-2">
            <h1
              className="text-2xl font-bold font-heading"
              style={{ color: "var(--brand-heading)" }}
            >
              {title}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>

          {children}

          <div className="pt-3 space-y-2">
            <Link
              href="/mis-servicios"
              className={cn(buttonVariants({ size: "lg" }), "w-full h-12")}
            >
              Ver mis servicios
            </Link>
            {propertyId && (
              <Link
                href={`/p/${propertyId}`}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "w-full",
                )}
              >
                Volver a la propiedad
              </Link>
            )}
          </div>
        </article>
      </div>
    </main>
  );
}
