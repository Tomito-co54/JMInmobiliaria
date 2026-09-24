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
  HandCoins,
} from "lucide-react";
import type { DocumentInfo, DocumentSlug } from "@/lib/education/buying-process";
import { cn } from "@/lib/utils";

/** Static class names so Tailwind can see them. */
const SM_COLS: Record<number, string> = {
  1: "",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2",
};

const ICONS: Record<DocumentSlug, typeof FileText> = {
  reserva: PenLine,
  sena: HandCoins,
  informe_dominio: ShieldCheck,
  informe_inhibiciones: ShieldCheck,
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
 * Expanded: the document's details (see DocumentDetails).
 */
export function DocumentCard({ doc }: { doc: DocumentInfo }) {
  const Icon = ICONS[doc.slug] ?? FileText;

  return (
    <details className="group rounded-lg border bg-card transition-all hover:border-primary/30 hover:shadow-sm open:border-primary/40 open:shadow-md">
      <summary className="cursor-pointer p-4 list-none flex items-start gap-3 select-none">
        <div
          className="size-10 shrink-0 rounded-lg grid place-items-center"
          style={{
            backgroundColor: "var(--brand-icon-bg)",
            color: "var(--brand-icon-fg)",
          }}
        >
          <Icon className="size-5" />
        </div>
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center justify-between gap-3">
            <h4
              className="font-bold font-heading text-base sm:text-lg leading-tight"
              style={{ color: "var(--brand-heading)" }}
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

      <div className="px-4 pb-4 pt-1 border-t border-border/60">
        <DocumentDetails doc={doc} className="pt-3" />
      </div>
    </details>
  );
}

interface DocumentDetailsProps {
  doc: DocumentInfo;
  /** Off when the surrounding text already says what the document is. */
  showWhat?: boolean;
  className?: string;
}

/**
 * The body of a document: what it is, what it is for, the facts row and the
 * note. Shared by the accordion card and by a stage that shows its document
 * inline instead of behind a click.
 */
export function DocumentDetails({
  doc,
  showWhat = true,
  className,
}: DocumentDetailsProps) {
  // Cost and timeframe are optional: some documents are part of the
  // personal conversation, not a figure printed on the page.
  const facts: [string, string][] = [];
  facts.push([doc.issuedByLabel ?? "Quién lo emite", doc.issuedBy]);
  if (doc.cost) facts.push(["Costo aprox.", doc.cost]);
  if (doc.timeframe) facts.push(["Plazo", doc.timeframe]);
  if (doc.fees) facts.push(["Honorarios", doc.fees]);

  return (
    <div className={cn("space-y-4", className)}>
      {showWhat && (
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Qué es
          </p>
          <p className="text-sm leading-relaxed">{doc.what}</p>
        </div>
      )}

      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Para qué sirve
        </p>
        <p className="text-sm leading-relaxed">{doc.why}</p>
      </div>

      <dl className={cn("grid grid-cols-1 gap-3 pt-2", SM_COLS[facts.length])}>
        {facts.map(([label, value]) => (
          <div key={label} className="rounded-md bg-muted/40 p-3">
            <dt className="text-[0.65rem] uppercase tracking-wider text-muted-foreground mb-1">
              {label}
            </dt>
            <dd className="text-xs leading-snug">{value}</dd>
          </div>
        ))}
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
    </div>
  );
}
