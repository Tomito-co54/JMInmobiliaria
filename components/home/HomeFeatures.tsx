import {
  ShieldCheck,
  Sparkles,
  Target,
  FileText,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PARTIDOS_ZONA_SUR } from "@/lib/zona-sur/partidos";

/**
 * Mid-landing transition section between the hero and the property
 * catalog. Explains the product in 4 features + a stats strip.
 *
 * Server Component — queries Supabase directly for live numbers
 * (properties indexed, ARBA-verified percentage). Falls back to
 * conservative defaults if the count query fails so the page never
 * crashes over an analytic detail.
 */

async function getLandingStats() {
  try {
    const supabase = await createClient();
    const { count: total } = await supabase
      .from("properties")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);
    const { count: withArba } = await supabase
      .from("properties")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .not("partida", "is", null);
    const t = total ?? 0;
    const a = withArba ?? 0;
    const pct = t > 0 ? Math.round((a / t) * 100) : 0;
    return { total: t, arbaPct: pct };
  } catch {
    return { total: 0, arbaPct: 0 };
  }
}

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Datos verificados con ARBA",
    description:
      "Cada propiedad la cruzamos contra el catastro oficial de la Provincia. Vas a ver superficie real, partida, nomenclatura y polígono — no solo lo que dice el aviso.",
  },
  {
    icon: Sparkles,
    title: "Quality Score transparente",
    description:
      "Un puntaje 0-100 que combina calidad del aviso, coherencia con ARBA, tiempo en mercado y precio vs. comparables. Cada componente con explicación abierta — sin caja negra.",
  },
  {
    icon: Target,
    title: "Match personalizado",
    description:
      "Definís qué buscás (zonas, precio, ambientes, no-negociables) y te decimos cuán bien encaja cada propiedad. Alertas cuando aparezca algo nuevo que te encaje.",
  },
  {
    icon: FileText,
    title: "Servicios automatizados",
    description:
      "Informes catastrales en PDF generados al instante. Próximamente: informes de dominio, cédulas catastrales y tasaciones formales — todo desde la misma plataforma.",
  },
] as const;

export async function HomeFeatures() {
  const stats = await getLandingStats();

  return (
    <section className="relative px-4 py-14 sm:py-20 bg-gradient-to-b from-background via-background to-muted/30 overflow-hidden">
      {/* Subtle decorative shapes — give the section visual weight without
          relying on imagery. The blur + low opacity keeps them in the
          background. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 size-72 rounded-full opacity-20 blur-3xl"
        style={{ backgroundColor: "var(--brand-navy)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-20 size-80 rounded-full opacity-15 blur-3xl"
        style={{ backgroundColor: "var(--brand-gold)" }}
      />

      <div className="relative max-w-5xl mx-auto space-y-12 sm:space-y-16">
        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-4 sm:gap-8 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 duration-700">
          <div className="space-y-1">
            <p
              className="text-3xl sm:text-5xl font-bold font-heading tabular-nums leading-none"
              style={{ color: "var(--brand-navy)" }}
            >
              {stats.total}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wider">
              propiedades indexadas
            </p>
          </div>
          <div className="space-y-1 border-x border-border/60">
            <p
              className="text-3xl sm:text-5xl font-bold font-heading tabular-nums leading-none"
              style={{ color: "var(--brand-navy)" }}
            >
              {PARTIDOS_ZONA_SUR.length}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wider">
              partidos cubiertos
            </p>
          </div>
          <div className="space-y-1">
            <p
              className="text-3xl sm:text-5xl font-bold font-heading tabular-nums leading-none"
              style={{ color: "var(--brand-gold)" }}
            >
              {stats.arbaPct}%
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wider">
              con datos ARBA
            </p>
          </div>
        </div>

        {/* Section heading */}
        <div className="space-y-3 text-center max-w-2xl mx-auto motion-safe:animate-in motion-safe:fade-in duration-700 delay-150">
          <p
            className="text-xs uppercase tracking-[0.18em] font-medium"
            style={{ color: "var(--brand-gold)" }}
          >
            Por qué Jotaeme
          </p>
          <h2
            className="text-2xl sm:text-4xl font-bold font-heading tracking-tight"
            style={{ color: "var(--brand-navy)" }}
          >
            La información que necesitás{" "}
            <span className="italic">antes</span> de comprar
          </h2>
          <p className="text-base text-muted-foreground">
            La asimetría histórica entre el que compra y el que vende existe
            porque la data está dispersa. Nosotros la juntamos y la mostramos
            de forma clara.
          </p>
        </div>

        {/* Feature cards */}
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <li
                key={feature.title}
                className="group relative rounded-xl border bg-card p-5 sm:p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/40 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 duration-700"
                style={{ animationDelay: `${200 + i * 100}ms` }}
              >
                <div
                  className="inline-flex size-11 items-center justify-center rounded-lg mb-4 transition-colors duration-300"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--brand-navy) 8%, transparent)",
                    color: "var(--brand-navy)",
                  }}
                >
                  <Icon className="size-5" />
                </div>
                <h3
                  className="text-lg font-bold font-heading mb-2 leading-tight"
                  style={{ color: "var(--brand-navy)" }}
                >
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
                {/* Subtle gold accent line that grows on hover */}
                <div
                  aria-hidden
                  className="absolute bottom-0 left-5 right-5 sm:left-6 sm:right-6 h-0.5 rounded-full origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"
                  style={{ backgroundColor: "var(--brand-gold)" }}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
