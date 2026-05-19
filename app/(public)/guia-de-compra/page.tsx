import Link from "next/link";
import { ArrowLeft, BookOpen, FileText, ScrollText } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { BrandLogo } from "@/components/shared/BrandLogo";
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
    "Comprar una propiedad en Argentina, explicado paso a paso. Documentos, plazos, costos y qué función cumple cada cosa.",
};

/**
 * /guia-de-compra — educational page that walks through the AR
 * property-buying process. Static content, no auth required.
 *
 * Structure:
 *   - Hero with intro
 *   - Quick-jump nav to the 6 etapas
 *   - Timeline of etapas with documents under each
 *   - Glossary section at the end
 */
export default function GuiaDeCompraPage() {
  return (
    <main className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="border-b sticky top-0 z-10 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            aria-label="Volver al inicio"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "-ml-2 gap-1.5",
            )}
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Inicio</span>
          </Link>

          <Link
            href="/"
            aria-label="Jotaeme"
            className="shrink-0"
          >
            <BrandLogo variant="isotipo" size={28} />
          </Link>

          <Link
            href="/buscar"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Buscar propiedades
          </Link>
        </div>
      </header>

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
            Comprar una propiedad en Argentina,{" "}
            <span className="italic">explicado</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Una sola operación en tu vida — o dos. La industria asume que
            sabés cómo funciona, pero la mayoría llega sin información. Acá
            te lo explicamos paso por paso: qué tenés que hacer en cada
            etapa, qué documentos necesitás, qué función cumple cada uno y
            cuánto cuesta.
          </p>
          <p className="text-sm text-muted-foreground italic">
            Esta guía está pensada para Argentina, con foco en la Provincia
            de Buenos Aires. Algunos detalles varían en CABA y otras
            jurisdicciones.
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
                    "h-8 text-xs",
                  )}
                >
                  <span
                    className="inline-block size-5 rounded-full text-[0.65rem] font-bold grid place-items-center mr-1.5"
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
                  "h-8 text-xs gap-1.5",
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
              Los más comunes — los que te van a tirar inmobiliaria, escribano,
              banco o el contrato del boleto. Click en cada uno para ver la
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
            Configurá tu perfil de búsqueda en Jotaeme y empezá a recibir
            propiedades que te encajen — con scoring de calidad y datos
            verificados con ARBA.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <Link href="/buscar" className={buttonVariants({ size: "lg" })}>
              Ver propiedades
            </Link>
            <Link
              href="/register"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Crear cuenta gratis
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
