import {
  FileText,
  Building2,
  ShieldCheck,
  Ruler,
  Receipt,
  Landmark,
  PenLine,
  Stamp,
  Banknote,
} from "lucide-react";
import type { DocumentInfo, DocumentSlug } from "@/lib/education/buying-process";

const ICONS: Record<DocumentSlug, typeof FileText> = {
  reserva: PenLine,
  informe_dominio: ShieldCheck,
  informe_inhibiciones: ShieldCheck,
  certificado_catastral: Ruler,
  estado_parcelario: Ruler,
  libre_deuda_municipal: Receipt,
  libre_deuda_provincial: Banknote,
  libre_deuda_expensas: Building2,
  boleto_compraventa: FileText,
  escritura: Stamp,
};

/**
 * Card for a single document in the buying process. Uses native
 * <details>/<summary> for accordion behavior — no JS required.
 *
 * The summary always shows: icon + title + short description + chevron.
 * Expanded: what, why, who issues it, cost, timeframe, notes, and a
 * CTA to Jotaeme's service if we offer it (serviceId set).
 */
export function DocumentCard({ doc }: { doc: DocumentInfo }) {
  const Icon = ICONS[doc.slug] ?? FileText;

  return (
    <details className="group rounded-lg border bg-card transition-all hover:border-primary/30 hover:shadow-sm open:border-primary/40 open:shadow-md">
      <summary className="cursor-pointer p-4 list-none flex items-start gap-3 select-none">
        <div
          className="size-10 shrink-0 rounded-lg grid place-items-center"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--brand-navy) 8%, transparent)",
            color: "var(--brand-navy)",
          }}
        >
          <Icon className="size-5" />
        </div>
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center justify-between gap-3">
            <h4
              className="font-bold font-heading text-base sm:text-lg leading-tight"
              style={{ color: "var(--brand-navy)" }}
            >
              {doc.title}
            </h4>
            <svg
              aria-hidden
              className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {doc.shortDescription}
          </p>
        </div>
      </summary>

      <div className="px-4 pb-4 pt-1 space-y-4 border-t border-border/60">
        <div className="space-y-1 pt-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Qué es
          </p>
          <p className="text-sm leading-relaxed">{doc.what}</p>
        </div>

        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Para qué sirve
          </p>
          <p className="text-sm leading-relaxed">{doc.why}</p>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="rounded-md bg-muted/40 p-3">
            <dt className="text-[0.65rem] uppercase tracking-wider text-muted-foreground mb-1">
              Quién lo emite
            </dt>
            <dd className="text-xs leading-snug">{doc.issuedBy}</dd>
          </div>
          <div className="rounded-md bg-muted/40 p-3">
            <dt className="text-[0.65rem] uppercase tracking-wider text-muted-foreground mb-1">
              Costo aprox.
            </dt>
            <dd className="text-xs leading-snug">{doc.cost}</dd>
          </div>
          <div className="rounded-md bg-muted/40 p-3">
            <dt className="text-[0.65rem] uppercase tracking-wider text-muted-foreground mb-1">
              Plazo
            </dt>
            <dd className="text-xs leading-snug">{doc.timeframe}</dd>
          </div>
        </dl>

        {doc.notes && (
          <div
            className="flex items-start gap-2 rounded-md p-3"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--brand-gold) 12%, transparent)",
              borderLeft: "3px solid var(--brand-gold)",
            }}
          >
            <Landmark
              className="size-4 shrink-0 mt-0.5"
              style={{ color: "var(--brand-gold)" }}
            />
            <p className="text-xs leading-relaxed">{doc.notes}</p>
          </div>
        )}

        {doc.serviceId && (
          <div className="pt-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full"
              style={{
                backgroundColor:
                  "color-mix(in srgb, var(--brand-navy) 8%, transparent)",
                color: "var(--brand-navy)",
              }}
            >
              ✓ Disponible como servicio en Jotaeme
            </span>
          </div>
        )}
      </div>
    </details>
  );
}
