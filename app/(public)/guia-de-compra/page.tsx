import Link from "next/link";
import { BookOpen, FileText, ScrollText } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PublicHeader } from "@/components/shared/PublicHeader";
import {
  GLOSSARY,
  PROCESS_STEPS,
} from "@/lib/education/buying-process";
import { ProcessTimeline } from "@/components/education/ProcessTimeline";
import { GlossarySection } from "@/components/education/GlossarySection";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Guía de compra — Jotaeme",
  description:
    "Cómo es comprar una propiedad en Zona Sur, etapa por etapa: documentos, plazos y costos.",
};

/**
 * /guia-de-compra — educational page that walks through the AR
 * property-buying process. No auth required; the shared PublicHeader
 * reads the session, as on every other public page.
 *
 * Structure:
 *   - Hero with intro
 *   - Quick-jump nav to the etapas
 *   - Timeline of etapas with documents under each
 *   - Glossary section at the end
 */
export default function GuiaDeCompraPage() {
  return (
    <main className="min-h-screen flex flex-col bg-background">
      <PublicHeader active="guia" />

      {/* Hero */}
      <section className="px-4 pt-12 pb-10 sm:pt-16 sm:pb-12">
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="flex items-center gap-2 text-sm">
            <BookOpen
              className="size-4"
              style={{ color: "var(--brand-gold)" }}
            />
            <span
              className="uppercase tracking-[0.18em] text-xs font-medium"
              style={{ color: "var(--brand-gold)" }}
            >
              Guía de compra
            </span>
          </div>
          <h1
            className="text-3xl sm:text-5xl font-bold font-heading leading-tight"
            style={{ color: "var(--brand-heading)" }}
          >
            Comprar una propiedad,{" "}
            <span className="italic">etapa por etapa</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            De la primera idea a la escritura, una compra atraviesa siete
            etapas. Cada una tiene sus documentos, sus plazos y sus
            decisiones.
          </p>
          <p className="text-sm text-muted-foreground italic">
            Los plazos y costos son de la Provincia de Buenos Aires, que es
            donde trabajamos. En CABA y otras jurisdicciones algunos detalles
            cambian.
          </p>
        </div>
      </section>

      {/* Quick-jump nav */}
      <section className="px-4 pb-8">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-lg border bg-muted/30 p-4 sm:p-5 space-y-3">
            <p
              className="text-xs uppercase tracking-wider font-medium"
              style={{ color: "var(--brand-heading)" }}
            >
              <FileText className="inline size-3.5 mr-1 -mt-0.5" />
              Saltá directo a una etapa
            </p>
            <nav className="flex flex-wrap gap-2">
              {PROCESS_STEPS.map((s) => (
                <a
                  key={s.slug}
                  href={`#etapa-${s.slug}`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "h-11 text-xs",
                  )}
                >
                  <span
                    className="inline-grid size-5 shrink-0 place-items-center rounded-full text-[0.65rem] font-bold leading-none mr-1.5"
                    style={{
                      backgroundColor: "var(--brand-circle-bg)",
                      color: "var(--brand-circle-fg)",
                    }}
                  >
                    {s.number}
                  </span>
                  {s.title}
                </a>
              ))}
              <a
                href="#glosario"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "h-11 text-xs gap-1.5",
                )}
              >
                <ScrollText className="size-3.5" />
                Glosario
              </a>
            </nav>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="px-4 pb-16 sm:pb-20">
        <div className="max-w-3xl mx-auto">
          <ProcessTimeline steps={PROCESS_STEPS} />
        </div>
      </section>

      {/* Glossary */}
      <section
        id="glosario"
        className="px-4 py-14 sm:py-20 border-t bg-muted/30 scroll-mt-16"
      >
        <div className="max-w-3xl mx-auto space-y-6">
          <header className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <ScrollText
                className="size-4"
                style={{ color: "var(--brand-gold)" }}
              />
              <span
                className="uppercase tracking-[0.18em] text-xs font-medium"
                style={{ color: "var(--brand-gold)" }}
              >
                Glosario
              </span>
            </div>
            <h2
              className="text-2xl sm:text-4xl font-bold font-heading"
              style={{ color: "var(--brand-heading)" }}
            >
              Términos que vas a escuchar
            </h2>
            <p className="text-sm text-muted-foreground">
              Los más comunes en una operación: los que aparecen en la reserva,
              el boleto, la escritura y los informes. Tocá cada uno para ver la
              definición.
            </p>
          </header>

          <GlossarySection entries={GLOSSARY} />
        </div>
      </section>

      {/* Footer CTA */}
      <section className="px-4 py-12 border-t">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <h2
            className="text-xl sm:text-2xl font-bold font-heading"
            style={{ color: "var(--brand-heading)" }}
          >
            ¿Ya estás buscando?
          </h2>
          <p className="text-sm text-muted-foreground">
            Decinos qué buscás y te guiamos. Es automático: sin necesidad de
            hacerte una cuenta ni dejar tus datos.
          </p>
          <div className="flex justify-center pt-2">
            <Link href="/propiedades" className={buttonVariants({ size: "lg" })}>
              Ver propiedades
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
