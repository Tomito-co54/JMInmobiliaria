import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Compass,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getAdvisorContext,
  type AdvisorAction,
} from "@/lib/education/advisor";
import { PROCESS_STEPS } from "@/lib/education/buying-process";

interface BuyingProcessAdvisorProps {
  propertyId: string;
  currentStage: string | null;
  /** When true and currentStage is null, render a soft prompt asking
   * the user to set their stage. When false, render nothing. */
  showSetupPrompt: boolean;
}

/**
 * Contextual advice card shown on /p/[id] when the user has set their
 * current stage in the buying process. Tells them where they are,
 * what's done, what's still pending, and the single most important
 * next action — with a CTA when we offer the service.
 *
 * Server Component. The data comes from lib/education/advisor.ts and
 * the property's relationship is purely via context (the advisor
 * doesn't know per-property state yet — that's deferred until we add
 * a `user_property_progress` table).
 */
export function BuyingProcessAdvisor({
  propertyId,
  currentStage,
  showSetupPrompt,
}: BuyingProcessAdvisorProps) {
  const ctx = getAdvisorContext(currentStage);

  if (!ctx) {
    if (!showSetupPrompt) return null;
    return (
      <section
        className="rounded-xl border-2 border-dashed p-4 sm:p-5 space-y-2"
        style={{ borderColor: "color-mix(in srgb, var(--brand-gold) 35%, transparent)" }}
      >
        <div className="flex items-center gap-2">
          <Compass className="size-4" style={{ color: "var(--brand-accent)" }} />
          <p
            className="text-xs uppercase tracking-[0.18em] font-medium"
            style={{ color: "var(--brand-accent)" }}
          >
            Tu proceso de compra
          </p>
        </div>
        <h3
          className="text-base font-bold font-heading leading-tight"
          style={{ color: "var(--brand-heading)" }}
        >
          ¿En qué etapa estás?
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Si nos contás dónde estás (mirando, reservando, pidiendo
          informes...), te mostramos qué te falta para esta propiedad y
          cuál es el próximo paso.
        </p>
        <Link
          href="/busquedas"
          className={cn(
            buttonVariants({ size: "sm", variant: "outline" }),
            "gap-1 mt-1",
          )}
        >
          Configurar mi etapa
          <ArrowRight className="size-3.5" />
        </Link>
      </section>
    );
  }

  const { stage, nextStage, currentDocs, mainAction } = ctx;

  return (
    <section className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <header
        className="px-4 sm:px-5 py-3 flex items-center gap-2 border-b"
        style={{
          backgroundColor: "var(--brand-icon-bg)",
        }}
      >
        <Compass
          className="size-4 shrink-0"
          style={{ color: "var(--brand-icon-fg)" }}
        />
        <div className="flex-1 min-w-0">
          <p
            className="text-[0.65rem] uppercase tracking-[0.16em] font-medium"
            style={{ color: "var(--brand-accent)" }}
          >
            Tu proceso · Etapa {stage.number} de {PROCESS_STEPS.length}
          </p>
          <p
            className="text-sm font-bold font-heading leading-tight"
            style={{ color: "var(--brand-heading)" }}
          >
            {stage.title}
          </p>
        </div>
      </header>

      {/* Mini progress bar — 6 dots */}
      <div className="px-4 sm:px-5 pt-3 pb-1">
        <ol className="flex items-center justify-between gap-1">
          {PROCESS_STEPS.map((s) => {
            const done = s.number < stage.number;
            const current = s.number === stage.number;
            return (
              <li
                key={s.slug}
                className="flex-1 flex items-center gap-1"
                aria-label={s.title}
                title={s.title}
              >
                <span
                  className={cn(
                    "size-2 rounded-full shrink-0",
                    current && "size-2.5 ring-2",
                  )}
                  style={{
                    backgroundColor: done
                      ? "var(--brand-accent)"
                      : current
                      ? "var(--brand-accent)"
                      : "color-mix(in srgb, var(--brand-heading) 20%, transparent)",
                    boxShadow: current
                      ? "0 0 0 2px color-mix(in srgb, var(--brand-accent) 35%, transparent)"
                      : undefined,
                  }}
                />
                {s.number < PROCESS_STEPS.length && (
                  <span
                    className="flex-1 h-px"
                    style={{
                      backgroundColor: done
                        ? "var(--brand-accent)"
                        : "color-mix(in srgb, var(--brand-heading) 15%, transparent)",
                    }}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* What you need at this stage */}
      <div className="px-4 sm:px-5 py-4 space-y-3">
        {currentDocs.length > 0 ? (
          <>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Documentos típicos de esta etapa
            </p>
            <ul className="space-y-1.5">
              {currentDocs.slice(0, 5).map((doc) => (
                <li
                  key={doc.slug}
                  className="flex items-start gap-2 text-sm leading-relaxed"
                >
                  <Circle
                    className="size-3.5 shrink-0 mt-0.5"
                    style={{ color: "var(--brand-accent)" }}
                  />
                  <span>
                    {doc.title}
                    {doc.serviceId && (
                      <span
                        className="ml-1.5 text-[0.65rem] font-medium px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor:
                            "color-mix(in srgb, var(--brand-gold) 18%, transparent)",
                          color: "var(--brand-icon-fg)",
                        }}
                      >
                        Lo ofrecemos
                      </span>
                    )}
                  </span>
                </li>
              ))}
              {currentDocs.length > 5 && (
                <li className="text-xs text-muted-foreground ml-5">
                  + {currentDocs.length - 5} más
                </li>
              )}
            </ul>
          </>
        ) : (
          <p className="text-sm leading-relaxed">{stage.what}</p>
        )}
      </div>

      {/* Main action / next step */}
      <div
        className="px-4 sm:px-5 py-4 border-t space-y-3"
        style={{
          backgroundColor: "color-mix(in srgb, var(--brand-gold) 5%, transparent)",
        }}
      >
        <div className="flex items-start gap-2">
          <CheckCircle2
            className="size-4 shrink-0 mt-0.5"
            style={{ color: "var(--brand-accent)" }}
          />
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Tu próximo paso
            </p>
            <p
              className="text-sm font-bold font-heading leading-tight"
              style={{ color: "var(--brand-heading)" }}
            >
              {mainAction.title}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {mainAction.description}
            </p>
          </div>
        </div>

        <ActionCta propertyId={propertyId} action={mainAction} />
      </div>

      {/* Footer link to full guide */}
      <div className="px-4 sm:px-5 py-3 border-t flex items-center justify-between text-xs">
        <Link
          href={`/guia-de-compra#etapa-${stage.slug}`}
          className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
        >
          Ver detalles de esta etapa
          <ArrowRight className="size-3" />
        </Link>
        {nextStage && (
          <span className="text-muted-foreground">
            Siguiente: {nextStage.title}
          </span>
        )}
      </div>
    </section>
  );
}

function ActionCta({
  propertyId,
  action,
}: {
  propertyId: string;
  action: AdvisorAction;
}) {
  if (action.kind === "buy_service") {
    return (
      <Link
        href={`/p/${propertyId}/servicios`}
        className={cn(buttonVariants({ size: "sm" }), "w-full sm:w-auto gap-1")}
      >
        Ir a servicios
        <ArrowRight className="size-3.5" />
      </Link>
    );
  }
  if (action.kind === "advance_stage") {
    return (
      <Link
        href="/busquedas"
        className={cn(
          buttonVariants({ size: "sm", variant: "outline" }),
          "w-full sm:w-auto gap-1",
        )}
      >
        Actualizar mi etapa
        <ArrowRight className="size-3.5" />
      </Link>
    );
  }
  return null;
}
