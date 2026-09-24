import type { Metadata } from "next";
import {
  Calculator,
  Construction,
  DraftingCompass,
  LandPlot,
  Ruler,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { PublicHeader } from "@/components/shared/PublicHeader";
import { Reveal } from "@/components/shared/Reveal";
import { WhatsAppButton } from "@/components/property/WhatsAppButton";
import {
  OTHER_SERVICE_MESSAGE,
  SERVICE_AREAS,
  type Service,
  type ServiceIcon,
} from "@/lib/servicios/catalogo";

export const metadata: Metadata = {
  title: "Servicios — Jotaeme",
  description:
    "Tasaciones, estado parcelario, mensura y subdivisión, planos municipales y demoliciones en Zona Sur del Gran Buenos Aires.",
};

const ICONS: Record<ServiceIcon, LucideIcon> = {
  tasacion: Calculator,
  "estado-parcelario": Ruler,
  mensura: LandPlot,
  planos: DraftingCompass,
  demolicion: Construction,
};

/**
 * /servicios — the work the agency does besides selling: appraisals,
 * surveying and municipal architecture (Tomy, 24-sep-2026).
 *
 * Laid out as three disciplines, each a numbered heading beside its
 * services, rather than a grid of identical cards (§6): the number and the
 * discipline carry the page, the services read as rows under it. Every
 * service ends in its own WhatsApp button, whose message already names the
 * service — the same path a listing uses, because it is the one that works.
 *
 * No prices on purpose: every job depends on the property, and the page says
 * so once instead of printing "a consultar" five times.
 */
export default function ServiciosPage() {
  return (
    <main className="min-h-screen flex flex-col bg-background">
      <PublicHeader active="servicios" />

      <section className="px-4 pt-12 pb-10 sm:pt-16 sm:pb-14">
        {/* Same container as the disciplines below, so the left edges line
            up; the text keeps its own reading width inside it. */}
        <Reveal className="max-w-5xl mx-auto [&>*]:max-w-3xl space-y-5">
          <div className="flex items-center gap-2">
            <Wrench className="size-4" style={{ color: "var(--brand-gold)" }} aria-hidden />
            <span
              className="uppercase tracking-[0.18em] text-xs font-medium"
              style={{ color: "var(--brand-gold)" }}
            >
              Servicios
            </span>
          </div>
          <h1
            className="text-3xl sm:text-5xl font-medium font-heading leading-[1.08] tracking-tight"
            style={{ color: "var(--brand-heading)" }}
          >
            Lo que una propiedad necesita,{" "}
            <span className="italic">además de venderse</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Tasaciones, agrimensura y planos: los trabajos que acompañan una compra, una venta o
            una obra, hechos por nosotros.
          </p>
          <p className="text-sm text-muted-foreground">
            Cada trabajo se presupuesta según la propiedad. Escribinos por el servicio que
            necesites y lo vemos.
          </p>
        </Reveal>
      </section>

      <div className="px-4 pb-16 sm:pb-24">
        <div className="max-w-5xl mx-auto space-y-14 sm:space-y-20">
          {SERVICE_AREAS.map((area, i) => (
            <section
              key={area.slug}
              id={area.slug}
              aria-labelledby={`${area.slug}-titulo`}
              className="scroll-mt-20 grid gap-6 border-t pt-8 sm:pt-10 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-12"
            >
              {/* The discipline. On a wide screen it stays beside its
                  services while they scroll past. */}
              <Reveal direction="left" className="lg:sticky lg:top-8 lg:self-start">
                <p
                  aria-hidden
                  className="font-heading italic text-5xl sm:text-6xl leading-none"
                  style={{ color: "var(--brand-gold)" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h2
                  id={`${area.slug}-titulo`}
                  className="mt-3 font-heading font-medium text-2xl sm:text-3xl tracking-tight"
                  style={{ color: "var(--brand-heading)" }}
                >
                  {area.title}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{area.intro}</p>
              </Reveal>

              <div className="divide-y">
                {area.services.map((service, j) => (
                  <ServiceRow key={service.slug} service={service} delayMs={j * 90} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <section className="px-4 py-12 border-t">
        <Reveal className="max-w-3xl mx-auto text-center space-y-4">
          <h2
            className="text-xl sm:text-2xl font-medium font-heading"
            style={{ color: "var(--brand-heading)" }}
          >
            ¿Buscás otro trabajo?
          </h2>
          <p className="text-sm text-muted-foreground">
            Si no está en la lista, contanos qué necesitás.
          </p>
          <div className="flex justify-center pt-2">
            <WhatsAppButton message={OTHER_SERVICE_MESSAGE} />
          </div>
        </Reveal>
      </section>
    </main>
  );
}

function ServiceRow({ service, delayMs }: { service: Service; delayMs: number }) {
  const Icon = ICONS[service.icon];
  return (
    <Reveal
      as="article"
      id={service.slug}
      delayMs={delayMs}
      className="scroll-mt-20 py-7 first:pt-0 sm:py-8 sm:first:pt-0"
    >
      <div className="flex items-start gap-4">
        <div
          className="size-11 shrink-0 rounded-xl grid place-items-center"
          style={{ backgroundColor: "var(--brand-icon-bg)", color: "var(--brand-icon-fg)" }}
          aria-hidden
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-4">
          <div className="space-y-1.5">
            <h3
              className="font-heading font-medium text-xl sm:text-2xl leading-tight"
              style={{ color: "var(--brand-heading)" }}
            >
              {service.title}
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              {service.summary}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Cuándo se necesita
            </p>
            <ul className="space-y-1.5">
              {service.when.map((w) => (
                <li key={w} className="flex gap-2.5 text-sm leading-relaxed">
                  <span
                    aria-hidden
                    className="mt-[0.55rem] size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: "var(--brand-gold)" }}
                  />
                  {w}
                </li>
              ))}
            </ul>
          </div>

          <WhatsAppButton message={service.message} size="sm" className="h-11" />
        </div>
      </div>
    </Reveal>
  );
}
