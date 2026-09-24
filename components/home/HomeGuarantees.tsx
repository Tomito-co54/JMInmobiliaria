import { Reveal } from "@/components/shared/Reveal";
import { HomeMatchBuilder } from "@/components/home/HomeMatchBuilder";
import { getMatchableCatalog } from "@/lib/db/properties";

/**
 * Home section below the protagonist: the match, on its tinted panel.
 *
 * It used to open with a manifesto ("La asimetría se rompe con datos") and a
 * verification block ("Publicamos los papeles, no solo las fotos… las
 * propiedades son nuestras y las cargamos a mano") beside the coverage map.
 * Both went on 23-sep-2026 at Tomy's word: that was the old version of the
 * site, and since the catalog also carries a partner's listings (lib/colegas)
 * the claim was no longer true. The matrícula slot lived in that block; when
 * the number exists it needs a new home (MARTILLERO in lib/brand/contact).
 *
 * Server Component: fetches the published catalog the match runs against and
 * renders the copy server-side; the meter is a client island.
 */

export async function HomeGuarantees() {
  const matchable = await getMatchableCatalog();

  return (
    <section className="relative px-4 py-20 sm:py-28 overflow-x-clip">
      <div className="max-w-6xl mx-auto">
        {/* The match, on a tinted panel. Decorative blobs give it life. */}
        <div className="relative rounded-[2rem] bg-muted/40 px-5 py-14 sm:px-12 sm:py-20 overflow-hidden">
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
                    // `key` en un elemento que se pasa como prop, que parece de
                    // más y no lo es: este JSX se crea en un Server Component
                    // y cruza a uno de cliente, así que React lo serializa y
                    // lo reconcilia en una posición de lista. Sin key avisa
                    // por consola en cada render de la home.
                    <div key="copy-match" className="mt-6">
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

            {/* Acá vivía "Del dato al informe, en tres pasos", que vendía el
                informe catastral pago. Los servicios pagos se dieron de baja
                enteros el 2-sep-2026 y la sección se fue con ellos. Es el
                lugar donde entrarían los servicios propios de la inmobiliaria
                el día que haya alguno que nombrar. */}
          </div>
        </div>
      </div>
    </section>
  );
}
