"use client";

import { useState, useTransition } from "react";
import { Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createServiceOrderAction } from "@/app/(public)/p/[id]/servicios/actions";
import type { ServiceDefinition } from "@/lib/services/catalog";

interface ServiceCardProps {
  service: ServiceDefinition;
  propertyId: string;
  signedIn: boolean;
}

function fmtPrice(amount: number, currency: "ARS" | "USD"): string {
  return `${currency} ${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(amount)}`;
}

export function ServiceCard({ service, propertyId, signedIn }: ServiceCardProps) {
  const [isPending, startTransition] = useTransition();
  const [redirecting, setRedirecting] = useState(false);

  const handleClick = () => {
    if (!signedIn) {
      toast.error("Iniciá sesión para contratar un servicio.");
      return;
    }
    startTransition(async () => {
      const result = await createServiceOrderAction(propertyId, service.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setRedirecting(true);
      window.location.href = result.redirectUrl;
    });
  };

  const disabled = isPending || redirecting;

  return (
    <article className="rounded-lg border bg-card p-5 space-y-4 transition-shadow hover:shadow-md">
      <header>
        <h3 className="text-lg font-bold font-heading text-foreground leading-tight">
          {service.title}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
      </header>

      <ul className="space-y-1.5">
        {service.highlights.map((h) => (
          <li
            key={h}
            className="flex items-start gap-2 text-sm text-foreground/90"
          >
            <Check className="size-4 text-[color:var(--brand-gold)] shrink-0 mt-0.5" />
            <span>{h}</span>
          </li>
        ))}
      </ul>

      <div className="flex items-end justify-between pt-2 border-t">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Precio</p>
          <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--brand-heading)" }}>
            {fmtPrice(service.price, service.currency)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{service.sla}</p>
        </div>
        <Button
          size="lg"
          onClick={handleClick}
          disabled={disabled}
          className="h-12 px-5"
        >
          {disabled ? <Loader2 className="size-4 animate-spin" /> : null}
          {redirecting ? "Redirigiendo…" : isPending ? "Procesando…" : "Contratar"}
        </Button>
      </div>
    </article>
  );
}
