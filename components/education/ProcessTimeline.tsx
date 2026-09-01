import { AlertTriangle, Check, ChevronRight } from "lucide-react";
import { Reveal } from "@/components/shared/Reveal";
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
 *
 * Each stage arrives as the reader reaches it, which is §2.3 read literally:
 * a process told as a sequence that animates *as the user advances*. The
 * reveal is per step and carries no index delay on purpose — a fixed
 * timetable would make stage 6 wait for stage 1 even when someone jumps
 * straight to it from the index at the top of the page. Here the movement
 * follows the reader instead of a schedule.
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
            "linear-gradient(to bottom, var(--brand-accent) 0%, color-mix(in srgb, var(--brand-accent) 30%, transparent) 50%, transparent 100%)",
        }}
      />

      {steps.map((step) => (
        <Reveal
          key={step.slug}
          as="li"
          id={`etapa-${step.slug}`}
          className="relative pl-16 scroll-mt-16"
        >
          {/* Numbered circle */}
          <div
            className="absolute left-0 top-0 size-12 rounded-full grid place-items-center font-bold font-heading text-lg shadow-lg ring-4 ring-background"
            style={{
              backgroundColor: "var(--brand-circle-bg)",
              color: "var(--brand-circle-fg)",
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
                style={{ color: "var(--brand-heading)" }}
              >
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground">{step.subtitle}</p>
            </header>

            <p className="text-sm sm:text-base leading-relaxed">{step.what}</p>

            {/* Our part first, and visually heavier: it is the answer to the
                question the reader actually has — "¿de qué se encargan
                ustedes?". The buyer's list follows, deliberately short. */}
            {step.weHandle.length > 0 && (
              <div
                className="space-y-2 rounded-lg p-4"
                style={{
                  backgroundColor: "var(--brand-icon-bg)",
                  borderLeft: "3px solid var(--brand-accent)",
                }}
              >
                <p
                  className="text-xs uppercase tracking-wider font-semibold"
                  style={{ color: "var(--brand-heading)" }}
                >
                  De esto nos encargamos nosotros
                </p>
                <ul className="space-y-2">
                  {step.weHandle.map((a) => (
                    <li
                      key={a}
                      className="flex items-start gap-2 text-sm leading-relaxed"
                    >
                      <Check
                        className="size-4 shrink-0 mt-0.5"
                        style={{ color: "var(--brand-accent)" }}
                      />
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {step.youDo.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Lo que queda de tu lado
                </p>
                <ul className="space-y-2">
                  {step.youDo.map((a) => (
                    <li
                      key={a}
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
        </Reveal>
      ))}
    </ol>
  );
}
