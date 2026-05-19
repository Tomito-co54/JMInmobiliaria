import { AlertTriangle, ChevronRight } from "lucide-react";
import {
  DOCUMENTS,
  type ProcessStep,
} from "@/lib/education/buying-process";
import { DocumentCard } from "./DocumentCard";

/**
 * Vertical timeline of the 6 steps in the buying process.
 *
 * Each step is a card with a big numbered circle, title, subtitle,
 * duration, expandable detail (acciones + documentos + warnings).
 * Connected by a vertical line on the left.
 *
 * Mobile-first — the numbered circle is the visual hook that ties
 * the steps together vertically.
 */
export function ProcessTimeline({ steps }: { steps: readonly ProcessStep[] }) {
  return (
    <ol className="relative space-y-6 sm:space-y-8">
      {/* Vertical connector line behind the circles */}
      <div
        aria-hidden
        className="absolute left-6 top-6 bottom-6 w-px"
        style={{
          background:
            "linear-gradient(to bottom, var(--brand-navy) 0%, color-mix(in srgb, var(--brand-navy) 30%, transparent) 50%, transparent 100%)",
        }}
      />

      {steps.map((step) => (
        <li
          key={step.slug}
          id={`etapa-${step.slug}`}
          className="relative pl-16 scroll-mt-16"
        >
          {/* Numbered circle */}
          <div
            className="absolute left-0 top-0 size-12 rounded-full grid place-items-center font-bold font-heading text-lg shadow-lg ring-4 ring-background"
            style={{
              backgroundColor: "var(--brand-navy)",
              color: "white",
            }}
          >
            {step.number}
          </div>

          <article className="space-y-4">
            <header className="space-y-1">
              <p
                className="text-xs uppercase tracking-[0.18em] font-medium"
                style={{ color: "var(--brand-gold)" }}
              >
                Etapa {step.number} · {step.duration}
              </p>
              <h3
                className="text-xl sm:text-2xl font-bold font-heading leading-tight"
                style={{ color: "var(--brand-navy)" }}
              >
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground">{step.subtitle}</p>
            </header>

            <p className="text-sm sm:text-base leading-relaxed">{step.what}</p>

            {step.actions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Qué hacer en esta etapa
                </p>
                <ul className="space-y-2">
                  {step.actions.map((a, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm leading-relaxed"
                    >
                      <ChevronRight
                        className="size-4 shrink-0 mt-0.5"
                        style={{ color: "var(--brand-gold)" }}
                      />
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {step.warnings && step.warnings.length > 0 && (
              <div className="space-y-2">
                {step.warnings.map((w, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-md p-3"
                    style={{
                      backgroundColor:
                        "color-mix(in srgb, #B08010 12%, transparent)",
                      borderLeft: "3px solid #B08010",
                    }}
                  >
                    <AlertTriangle className="size-4 shrink-0 mt-0.5 text-[#B08010]" />
                    <p className="text-xs leading-relaxed">{w}</p>
                  </div>
                ))}
              </div>
            )}

            {step.documentSlugs.length > 0 && (
              <div className="space-y-2.5 pt-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Documentos involucrados
                </p>
                <div className="space-y-2">
                  {step.documentSlugs.map((slug) => (
                    <DocumentCard key={slug} doc={DOCUMENTS[slug]} />
                  ))}
                </div>
              </div>
            )}
          </article>
        </li>
      ))}
    </ol>
  );
}
