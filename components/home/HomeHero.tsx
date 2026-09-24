import { Fragment } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Public home hero — the first 3 seconds.
 *
 * Direction-de-arte references:
 *   §1  "tech con alma": Fraunces protagonista (headline), Inter como
 *       anchor discreto (eyebrow + zonas).
 *   §2.4 transiciones suaves + §1 carácter: entry cascade (logo → eyebrow →
 *       headline → zonas → CTA → scroll hint) con animation-delay escalonado.
 *       No es un fade genérico: usa los keyframes home-rise / home-rise-hero
 *       (globals.css) con overshoot suave (settle) y, en el headline, un
 *       blur que se aclara para que la línea protagónica "llegue" con peso.
 *   §2.1 profundidad eje Z con intención: el fondo radial muy diluido
 *       crea un "foco" sutil bajo el contenido, no decora.
 *   §4   performance: solo CSS transform/opacity, motion-safe respeta
 *       prefers-reduced-motion, sin librería externa todavía.
 *   §6   lista negra: no degradé violeta; el tint es navy de marca al 3%.
 *
 * Las 4 preguntas (regla de oro):
 *   1. Confianza ✓ — marca clara + región geográfica concreta + CTA sin
 *      promesas vacías.
 *   2. Intención ✓ — cada entrada de la cascada está anclada al orden de
 *      lectura (marca → contexto → declaración → confirmación → acción).
 *   3. Gama media ✓ — solo CSS, sin imágenes pesadas ni canvas.
 *   4. Propio ✓ — la combinación Fraunces protagónico + eyebrow caps en
 *      dorado + zonas con middle-dot no es de plantilla.
 *
 * El copy del headline es placeholder (acordado con el owner) — el texto
 * va en `text-muted-foreground` + italic para que durante el desarrollo
 * sea evidente que no es producción.
 */
export function HomeHero({ zonas }: { zonas: string[] }) {
  return (
    // On a desktop the hero is exactly the first screen — the window minus
    // the header (4.75rem + its border) — with the content centred in it and
    // the gaps sized from the window's height, so it always frames down to
    // "Ver propiedades" (Tomy, 24-sep-2026: at 100% zoom the button was cut
    // off). Phones keep the plain flow: the headline fits there already.
    <section className="relative px-4 pt-12 pb-14 sm:pt-20 sm:pb-20 overflow-hidden lg:flex lg:min-h-[calc(100svh-4.75rem-1px)] lg:flex-col lg:justify-center lg:py-[5vh]">
      {/* Subtle radial spotlight behind the content.
          Light: navy of brand at 3% → transparent. Dark: white at 3%. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 dark:hidden"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 35%, color-mix(in srgb, var(--brand-navy) 3%, transparent) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 hidden dark:block"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 35%, color-mix(in srgb, white 4%, transparent) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-2xl mx-auto text-center space-y-7 sm:space-y-9 lg:space-y-[clamp(0.9rem,3.2vh,2.25rem)]">
        {/* Logo */}
        <div
          className="flex justify-center home-rise"
          style={{ animationDelay: "0ms" }}
        >
          <BrandLogo
            variant="full"
            size={120}
            priority
            className="h-[6.875rem] w-auto lg:h-[clamp(5.5rem,19vh,11rem)]"
          />
        </div>

        {/* Eyebrow — anchor de geografía/categoría. Caps + tracking ancho,
            dorado para ese chispazo editorial sin gritar. */}
        <p
          className="text-[0.7rem] sm:text-xs font-medium uppercase tracking-[0.25em] home-rise"
          style={{
            color: "var(--brand-accent)",
            animationDelay: "140ms",
          }}
        >
          Inmobiliaria · Zona Sur GBA
        </p>

        {/* Headline — Fraunces italic, la línea protagónica. El
            home-rise-hero le da el peso de entrada más pronunciado (más
            recorrido + blur que se aclara). */}
        <h1
          className="font-heading font-medium text-3xl sm:text-5xl lg:text-[clamp(2.5rem,7.2vh,3.9rem)] leading-[1.05] tracking-tight italic home-rise-hero"
          style={{
            color: "var(--brand-heading)",
            animationDelay: "260ms",
          }}
        >
          70 años de trayectoria
          <br />
          para acompañarte.
        </h1>

        {/* Zonas con middle-dot, sin caja final con coma — más editorial. */}
        {zonas.length > 0 && (
          <p
            className="text-sm sm:text-base text-muted-foreground home-rise"
            style={{ animationDelay: "440ms" }}
          >
            {/* The busiest localidades of the published catalog (Tomy,
                24-sep-2026), not a hand-written list: the old one named three
                partidos the catalog barely touched. */}
            {zonas.map((z, i) => (
              <Fragment key={z}>
                {i > 0 && <Bullet />}
                <span>{z}</span>
              </Fragment>
            ))}
          </p>
        )}

        {/* CTA. El chevron se desplaza 2px al hover (§2.2 — premia
            curiosidad). Ya no es un ancla: el catálogo vive en /propiedades,
            así que esto navega en vez de scrollear. */}
        <div
          className="pt-2 flex justify-center home-rise"
          style={{ animationDelay: "600ms" }}
        >
          {/* El CTA principal de la portada. Medía 35px de alto y ahora
              llega a 48 — la regla de §1 es 44 y este es EL botón que la
              página existe para que toques.

              El brillo que lo cruza es la única animación puramente
              atractiva del sitio, y entra por la tercera función que §2
              admite: guiar la mirada. Con la portada reducida a hero +
              protagonista + garantías, este botón es la única salida hacia el
              catálogo above the fold. Va lento (2,6s), espaciado (cada 6s) y
              detrás de motion-safe: un destello cada siete segundos se registra
              por el rabillo del ojo, uno cada uno es una luz de alarma. */}
          <Link
            href="/propiedades"
            className={cn(
              buttonVariants({ size: "lg" }),
              "group relative min-h-12 gap-1.5 overflow-hidden px-7 text-base",
              "transition-transform duration-200 ease-out",
              "motion-safe:hover:scale-[1.03] motion-safe:active:scale-[0.97]",
            )}
          >
            <span
              aria-hidden
              // La inclinación vive en el keyframe, no acá: la animación escribe
              // `transform` entero y se comería un `-skew-x-*` de clase.
              className="pointer-events-none absolute inset-y-0 left-0 w-5 bg-white/20 motion-safe:animate-[cta-sheen_7s_ease-out_1.2s_infinite]"
            />
            <span className="relative">Ver propiedades</span>
            <ArrowRight className="relative size-4 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>

      {/* Scroll hint — chevron pulsando suavemente. */}
      <div
        aria-hidden
        className="mt-10 sm:mt-14 flex justify-center home-rise lg:absolute lg:inset-x-0 lg:bottom-[2.5vh] lg:mt-0"
        style={{ animationDelay: "920ms" }}
      >
        <ChevronDown className="size-4 text-muted-foreground/50 motion-safe:animate-bounce" />
      </div>
    </section>
  );
}

/**
 * Decorative middle-dot separator between zona names. Lower opacity than
 * the names themselves so it visually recedes (the names are the data,
 * the dot is connective tissue).
 */
function Bullet() {
  return (
    <span aria-hidden className="opacity-40 mx-1.5">
      ·
    </span>
  );
}
