import { createClient } from "@/lib/supabase/server";
import type { FeaturedPropertyRow } from "@/lib/db/properties";
import {
  PUBLIC_LISTING_STATUS,
  PUBLIC_PROPERTY_SOURCES,
} from "@/lib/db/property-sources";
import {
  Reveal,
  ArbaParcelViz,
  ScoreRingViz,
  MatchDemo,
  ServiceSteps,
} from "@/components/home/HomeGuaranteesClient";

/**
 * Home "garantías" section (Block 4 del rediseño). Replaces the old 2x2
 * icon-card grid (which was exactly the §6 blacklist: grid de fichas todas
 * iguales). It is one section carrying TWO tones, per the approved design:
 *
 *   TONE 1 — ARBA / verificación: sober, editorial. Clean type, a quiet
 *     pedagogical diagram (parcel polygon drawing, partida appearing, m²
 *     counting). Transmits confianza, not spectacle. Ink palette.
 *   TONE 2 — Score / Match / Servicios: dynamic, "gamer" controlado. The
 *     score ring draws 0→N, the match reacts to taps, the report shows as
 *     a numbered sequence. Audaz pero prolijo. Gold accents, on a faint
 *     tinted panel so the tonal shift is felt without a hard cut (§2.4).
 *
 * Server Component: fetches the live ARBA coverage figure and a
 * representative score, renders all copy server-side (SEO), and delegates
 * only the scroll-triggered visuals to the client island.
 *
 * Stats decision (per the doc): the old 1/1/100% strip read weak with a
 * single published property and leaned on the generic look we avoid. The
 * one figure with real weight — % con datos ARBA — is folded into TONE 1
 * as an editorial number. Property/partido counts already live in the
 * catalog header, so they're not repeated here.
 *
 * Las 4 preguntas (regla de oro):
 *   1. Confianza ✓ — el fondo serio (ARBA real, score auditable) ancla todo.
 *   2. Intención ✓ — cada animación explica (§2.3) o revela al tocar (§2.2).
 *   3. Gama media ✓ — IntersectionObserver + transform/opacity, sin librería.
 *   4. Propio ✓ — composiciones editoriales, no cards de plantilla.
 */

async function getGuaranteeStats(): Promise<{ arbaPct: number; score: number }> {
  try {
    const supabase = await createClient();
    const publicSources = PUBLIC_PROPERTY_SOURCES as unknown as string[];
    const base = () =>
      supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true)
        .in("source", publicSources)
        .eq("listing_status", PUBLIC_LISTING_STATUS);

    const { count: total } = await base();
    const { count: withArba } = await base().not("partida", "is", null);

    // Representative score — the best published listing's score, so the ring
    // showcases a real, achievable number (falls back to a strong sample).
    const { data: scoreRows } = await supabase
      .from("properties")
      .select("quality_score")
      .eq("is_active", true)
      .in("source", publicSources)
      .eq("listing_status", PUBLIC_LISTING_STATUS)
      .not("quality_score", "is", null)
      .order("quality_score", { ascending: false })
      .limit(1);

    const t = total ?? 0;
    const a = withArba ?? 0;
    const pct = t > 0 ? Math.round((a / t) * 100) : 100;
    const topScore = (scoreRows?.[0] as { quality_score: number | null } | undefined)
      ?.quality_score;
    const score =
      topScore !== null && topScore !== undefined ? Math.round(topScore) : 84;
    return { arbaPct: pct, score };
  } catch {
    return { arbaPct: 100, score: 84 };
  }
}

export async function HomeGuarantees({
  featured,
}: {
  featured: FeaturedPropertyRow | null;
}) {
  const { arbaPct, score } = await getGuaranteeStats();

  // The ARBA parcel diagram shows the REAL partida + surface of the featured
  // property. When there's no featured property (or it lacks the data), the
  // viz falls back to its illustrative defaults.
  const parcelPartida = featured?.partida ?? undefined;
  const parcelSurface = featured?.surface_arba ?? featured?.surface_total ?? undefined;

  return (
    <section className="relative px-4 py-20 sm:py-28 overflow-x-clip">
      <div className="max-w-5xl mx-auto">
        {/* Intro manifesto */}
        <Reveal className="max-w-2xl mx-auto text-center">
          <p
            className="text-xs uppercase tracking-[0.2em] font-medium"
            style={{ color: "var(--brand-gold)" }}
          >
            Cómo trabajamos
          </p>
          <h2
            className="mt-3 font-heading font-medium text-3xl sm:text-4xl leading-[1.12] tracking-tight"
            style={{ color: "var(--brand-heading)" }}
          >
            La asimetría se rompe con datos,{" "}
            <span className="italic">no con promesas.</span>
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            El que vende siempre supo más que el que compra. Damos vuelta esa
            balanza con información verificable y abierta, propiedad por
            propiedad.
          </p>
        </Reveal>

        {/* ============ TONE 1 — ARBA / verificación (sobrio) ============ */}
        <div className="mt-20 sm:mt-28 grid md:grid-cols-2 gap-10 md:gap-14 items-center">
          <Reveal className="order-2 md:order-1">
            {/* Sober ink eyebrow — NOT gold. Encodes the quiet tone. */}
            <p
              className="text-[0.7rem] uppercase tracking-[0.22em] font-medium"
              style={{ color: "color-mix(in srgb, var(--brand-heading) 55%, transparent)" }}
            >
              Verificación catastral
            </p>
            <h3
              className="mt-3 font-heading font-medium text-2xl sm:text-3xl leading-tight tracking-tight"
              style={{ color: "var(--brand-heading)" }}
            >
              Cada propiedad, cruzada contra el catastro oficial.
            </h3>
            <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
              No publicamos lo que dice el aviso. Cruzamos cada ficha contra{" "}
              <span className="font-medium text-foreground">ARBA</span> —el
              organismo de recaudación de la Provincia— y mostramos la
              superficie real, la partida, la nomenclatura y el polígono exacto
              de la parcela.
            </p>
            <div className="mt-7 flex items-baseline gap-3">
              <span
                className="text-5xl font-bold font-heading tabular-nums leading-none"
                style={{ color: "var(--brand-heading)" }}
              >
                {arbaPct}%
              </span>
              <span className="text-sm text-muted-foreground max-w-[16ch]">
                de nuestras propiedades con datos ARBA verificados
              </span>
            </div>
          </Reveal>
          <Reveal className="order-1 md:order-2" delayMs={120}>
            <ArbaParcelViz partida={parcelPartida} surfaceM2={parcelSurface} />
          </Reveal>
        </div>

        {/* ============ TONE 2 — dinámico (panel tintado) ============ */}
        {/* The tint + the gradient lead-in make the tonal shift felt without
            a hard cut (§2.4). Decorative blobs give it life. */}
        <div className="relative mt-20 sm:mt-28 rounded-[2rem] bg-muted/40 px-5 py-14 sm:px-12 sm:py-20 overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 -right-16 size-72 rounded-full opacity-20 blur-3xl"
            style={{ backgroundColor: "var(--brand-gold)" }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -left-20 size-72 rounded-full opacity-10 blur-3xl"
            style={{ backgroundColor: "var(--brand-soft-tint-1)" }}
          />

          <div className="relative space-y-20 sm:space-y-28">
            {/* Movement B — Quality Score (ring draws 0→N) */}
            <div className="grid md:grid-cols-2 gap-10 md:gap-14 items-center">
              <Reveal>
                <p
                  className="text-[0.7rem] uppercase tracking-[0.22em] font-medium"
                  style={{ color: "var(--brand-gold)" }}
                >
                  Quality Score
                </p>
                <h3
                  className="mt-3 font-heading font-medium text-2xl sm:text-3xl leading-tight tracking-tight"
                  style={{ color: "var(--brand-heading)" }}
                >
                  Un número que sí podés auditar.
                </h3>
                <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
                  De 0 a 100. Combina la calidad del aviso, la coherencia con
                  ARBA, el tiempo en mercado y el precio contra comparables.
                  Cada componente, abierto. Sin caja negra.
                </p>
              </Reveal>
              <Reveal delayMs={120} className="flex justify-center">
                <ScoreRingViz score={score} />
              </Reveal>
            </div>

            {/* Movement C — Match (reacts to taps). Viz on the left for rhythm. */}
            <div className="grid md:grid-cols-2 gap-10 md:gap-14 items-center">
              <Reveal className="order-2 md:order-1 flex justify-center" delayMs={120}>
                <MatchDemo />
              </Reveal>
              <Reveal className="order-1 md:order-2">
                <p
                  className="text-[0.7rem] uppercase tracking-[0.22em] font-medium"
                  style={{ color: "var(--brand-gold)" }}
                >
                  Match personalizado
                </p>
                <h3
                  className="mt-3 font-heading font-medium text-2xl sm:text-3xl leading-tight tracking-tight"
                  style={{ color: "var(--brand-heading)" }}
                >
                  Decinos qué buscás. Responde al instante.
                </h3>
                <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Definís tus no-negociables —zona, precio, ambientes— y te
                  decimos cuán bien encaja cada propiedad. Probalo: tocá los
                  criterios y mirá cómo se mueve el match.
                </p>
              </Reveal>
            </div>

            {/* Movement D — Servicios (numbered sequence; §2.3) */}
            <div>
              <Reveal className="text-center max-w-2xl mx-auto">
                <p
                  className="text-[0.7rem] uppercase tracking-[0.22em] font-medium"
                  style={{ color: "var(--brand-gold)" }}
                >
                  Servicios
                </p>
                <h3
                  className="mt-3 font-heading font-medium text-2xl sm:text-3xl leading-tight tracking-tight"
                  style={{ color: "var(--brand-heading)" }}
                >
                  Del dato al informe, en tres pasos.
                </h3>
                <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
                  El informe catastral se arma solo, en vivo, mientras lo mirás.
                </p>
              </Reveal>
              <div className="mt-10 sm:mt-14">
                <ServiceSteps />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
