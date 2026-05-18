import { CheckCircle2, AlertTriangle, AlertOctagon } from "lucide-react";
import { TermDefinition } from "@/components/shared/TermDefinition";
import { deriveVerifiedDataItems } from "@/lib/property/verified-data";
import type { PublicArbaLookup, PublicPropertyRow } from "@/lib/db/properties";
import { cn } from "@/lib/utils";

/**
 * "Datos oficiales" — the section that turns raw catastral data into a
 * scannable status list for the buyer.
 *
 *   ✅ verified — dato cruzado contra ARBA, todo OK
 *   ⚠️ warning  — dato presente pero con alerta (parcial, leve discrepancia)
 *   🚨 missing  — dato faltante o discrepancia grave
 *
 * Each row is one fact about the property's documentation. Terms that have
 * a glossary entry are wrapped in TermDefinition so the buyer can tap them.
 */

const STATUS_ICON = {
  verified: { Icon: CheckCircle2, color: "text-emerald-600" },
  warning: { Icon: AlertTriangle, color: "text-amber-600" },
  missing: { Icon: AlertOctagon, color: "text-red-600" },
} as const;

interface VerifiedDataListProps {
  property: Pick<
    PublicPropertyRow,
    | "partida"
    | "nomenclatura_catastral"
    | "surface_arba"
    | "surface_total"
    | "surface_covered"
    | "lat"
    | "lng"
  >;
  arbaLookup: PublicArbaLookup | null;
}

export function VerifiedDataList({ property, arbaLookup }: VerifiedDataListProps) {
  const items = deriveVerifiedDataItems(property, arbaLookup);

  return (
    <section className="rounded-lg border bg-card p-5 sm:p-6 space-y-4">
      <header className="space-y-1">
        <h2 className="font-semibold text-base">Datos oficiales</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Lo que pudimos verificar contra ARBA, el organismo catastral de la
          provincia de Buenos Aires.
        </p>
      </header>
      <ul className="space-y-3">
        {items.map((item) => {
          const { Icon, color } = STATUS_ICON[item.status];
          return (
            <li key={item.id} className="flex items-start gap-3">
              <Icon className={cn("size-5 shrink-0 mt-0.5", color)} aria-hidden />
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="font-medium text-sm leading-snug">
                  {item.termId ? (
                    <TermDefinition term={item.termId} hideIcon>
                      {item.title}
                    </TermDefinition>
                  ) : (
                    item.title
                  )}
                </p>
                {item.detail && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.detail}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
