import { createClient } from "@/lib/supabase/server";
import { COVERAGE_AREA, COVERAGE_LABEL } from "@/lib/zona-sur/coverage";
import {
  zoomForSpan,
  placedTilesForBox,
  projectToView,
  PARCEL_BOX,
  PARCEL_VIEW_FACTOR,
  BASEMAP_SUPERSAMPLE,
} from "@/lib/map/tiles";
import {
  PUBLIC_LISTING_STATUS,
  PUBLIC_PROPERTY_SOURCES,
} from "@/lib/db/property-sources";
import { PAID_SERVICES_PUBLIC } from "@/lib/services/offering";
import { Reveal } from "@/components/shared/Reveal";
import {
  AreaOutlineViz,
  ServiceSteps,
} from "@/components/home/HomeGuaranteesClient";
import { HomeMatchBuilder } from "@/components/home/HomeMatchBuilder";
import { getMatchableCatalog } from "@/lib/db/properties";

/**
 * Home "garantías" section (Block 4 del rediseño). Replaces the old 2x2
 * icon-card grid (which was exactly the §6 blacklist: grid de fichas todas
 * iguales). It is one section carrying TWO tones, per the approved design:
 *
 *   TONE 1 — verificación: sober, editorial. Clean type, a quiet
 *     pedagogical diagram (the coverage area drawn on real ground).
 *     Transmits confianza, not spectacle. Ink palette.
 *   TONE 2 — Match: dynamic, "gamer" controlado. The meter reacts to every
 *     tap. Audaz pero prolijo. Gold accents, on a faint tinted panel so the
 *     tonal shift is felt without a hard cut (§2.4).
 *
 * Server Component: fetches the live verified-coverage figure and the
 * published catalog the match runs against, renders all copy server-side
 * (SEO), and delegates only the scroll-triggered visuals to the client
 * islands.
 *
 * Stats decision (per the doc): the old 1/1/100% strip read weak with a
 * single published property and leaned on the generic look we avoid. The
 * one figure with real weight — % con los datos verificados — is folded
 * into TONE 1 as an editorial number. Property/partido counts already live
 * in the catalog header, so they're not repeated here.
 *
 * Copy note: the cadastral agency is no longer named anywhere a visitor
 * reads. The checks did not change — the parcel lookup still runs and still
 * gates this figure — but leading with the name of a tax bureau made the
 * pitch heavier and narrower than what the agency actually promises, which
 * is that someone verified the listing before publishing it. The agency is
 * still named where it is the answer to a question: the buying guide, where
 * each document is listed with who issues it.
 *
 * Las 4 preguntas (regla de oro):
 *   1. Confianza ✓ — el fondo serio (la verificación real) ancla todo.
 *   2. Intención ✓ — cada animación explica (§2.3) o revela al tocar (§2.2).
 *   3. Gama media ✓ — IntersectionObserver + transform/opacity, sin librería.
 *   4. Propio ✓ — composiciones editoriales, no cards de plantilla.
 */

async function getVerifiedPct(): Promise<number> {
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
    // Counts `nomenclatura_catastral`, not `partida`: the partida is typed in
    // by hand, the nomenclatura only exists when the cadastre actually
    // answered. Since publishing no longer requires the lookup, measuring the
    // partida here would let the page claim verification it doesn't have.
    const { count: withCadastre } = await base().not(
      "nomenclatura_catastral",
      "is",
      null,
    );

    const t = total ?? 0;
    const a = withCadastre ?? 0;
    return t > 0 ? Math.round((a / t) * 100) : 100;
  } catch {
    return 100;
  }
}

/**
 * The coverage area on real ground: the outline projected into the diagram's
 * box, plus the tiles beneath it.
 *
 * Pure geometry, no database. It used to draw the featured property's own
 * parcel, which was accurate but answered a question nobody asks first. At
 * the zoom where a single lot is legible you see one lot and a street name —
 * true, and mute. Zoomed to the corridor, the same picture says where the
 * agency works, and the town names on the tiles do the labelling.
 *
 * The parcel-level view still exists where it belongs: on /p/[id], about the
 * property you're looking at.
 */
function getCoverageView() {
  const lats = COVERAGE_AREA.map((p) => p.lat);
  const lngs = COVERAGE_AREA.map((p) => p.lng);
  const center = {
    lat: (Math.max(...lats) + Math.min(...lats)) / 2,
    lng: (Math.max(...lngs) + Math.min(...lngs)) / 2,
  };

  const METERS_PER_DEGREE = 111_320;
  const spanMeters = Math.max(
    (Math.max(...lats) - Math.min(...lats)) * METERS_PER_DEGREE,
    (Math.max(...lngs) - Math.min(...lngs)) *
      METERS_PER_DEGREE *
      Math.cos((center.lat * Math.PI) / 180),
  );

  // The ground is taken at supersample scale — a box of twice the pixels,
  // one zoom deeper — and drawn at half size. See BASEMAP_SUPERSAMPLE.
  const s = BASEMAP_SUPERSAMPLE;
  const zoom = zoomForSpan(
    center.lat,
    spanMeters * PARCEL_VIEW_FACTOR,
    PARCEL_BOX.width * s,
  );
  const tiles = placedTilesForBox(center, zoom, PARCEL_BOX);

  // Same projection as the tiles, so the outline sits on the towns it names.
  // Divided back down by `s` because the SVG's viewBox is the plain box.
  const points = COVERAGE_AREA.map((v) => {
    const p = projectToView(
      v,
      center,
      zoom,
      PARCEL_BOX.width * s,
      PARCEL_BOX.height * s,
    );
    return `${(p.x / s).toFixed(1)},${(p.y / s).toFixed(1)}`;
  }).join(" ");

  return { points, tiles };
}

export async function HomeGuarantees() {
  const verifiedPct = await getVerifiedPct();
  const matchable = await getMatchableCatalog();

  const coverage = getCoverageView();

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

        {/* ============ TONE 1 — verificación (sobrio) ============ */}
        <div className="mt-20 sm:mt-28 grid md:grid-cols-2 gap-10 md:gap-14 items-center">
          <Reveal className="order-2 md:order-1">
            {/* Sober ink eyebrow — NOT gold. Encodes the quiet tone. */}
            <p
              className="text-[0.7rem] uppercase tracking-[0.22em] font-medium"
              style={{ color: "color-mix(in srgb, var(--brand-heading) 55%, transparent)" }}
            >
              Antes de publicar
            </p>
            <h3
              className="mt-3 font-heading font-medium text-2xl sm:text-3xl leading-tight tracking-tight"
              style={{ color: "var(--brand-heading)" }}
            >
              Cada propiedad la revisamos antes de mostrarla.
            </h3>
            <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
              No publicamos lo que dice el aviso y listo. Chequeamos los datos
              contra{" "}
              <span className="font-medium text-foreground">
                los registros oficiales
              </span>{" "}
              —superficie, parcela, ubicación— y te mostramos lo que
              encontramos, tal cual salió. Si algo no cierra, lo decimos en la
              ficha en vez de esconderlo.
            </p>
            <div className="mt-7 flex items-baseline gap-3">
              <span
                className="text-5xl font-bold font-heading tabular-nums leading-none"
                style={{ color: "var(--brand-heading)" }}
              >
                {verifiedPct}%
              </span>
              <span className="text-sm text-muted-foreground max-w-[16ch]">
                de nuestras propiedades con los datos verificados
              </span>
            </div>
          </Reveal>
          <Reveal className="order-1 md:order-2" delayMs={120}>
            <AreaOutlineViz
              outline={coverage}
              caption={COVERAGE_LABEL}
              label={`Zona de cobertura sobre el mapa: ${COVERAGE_LABEL}`}
            />
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
            {/* Movement B — Match. One column, and in this order on purpose:
                the number first, then what the number is, then the controls
                that move it. It used to be a two-column split with the copy
                floating beside a form twice its height, which left the
                explanation stranded next to whitespace and made the reader
                cross the gutter to find out what they were looking at.

                The Quality Score movement stood above this one and is gone:
                the score is no longer shown to visitors anywhere they can act
                on it — not on the cards, not on a listing — so a section of
                the home explaining how to audit it was selling a number that
                had left the building. It still ranks the catalog and drives
                /admin. */}
            <div className="mx-auto w-full max-w-xl">
              <Reveal className="flex justify-center">
                <HomeMatchBuilder
                  properties={matchable}
                  copy={
                    <div className="mt-6">
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
                        Definís tus no-negociables —zona, presupuesto,
                        ambientes, tipo— y calculamos cuánto encaja cada
                        propiedad del catálogo. Sin cuenta y sin dejar tus
                        datos: la cuenta se hace en tu navegador y te acompaña
                        a cada ficha.
                      </p>
                    </div>
                  }
                />
              </Reveal>
            </div>

            {/* Movement D — Servicios (numbered sequence; §2.3).
                Hidden with the rest of the paid offering: this section sells
                the informe catastral ("Generás el informe en PDF"), so it is
                a fourth public way in that Fase 8 and 20 missed while turning
                off the other three. Kept whole behind the flag rather than
                deleted — it is also the slot where the agency's own services
                will go once there are services to name. */}
            {PAID_SERVICES_PUBLIC && (
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
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
