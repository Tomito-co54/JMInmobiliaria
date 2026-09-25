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
 * El headline es de Tomy (24-sep-2026): "Vos decidís / nuestra experiencia
 * te ayuda". Reemplazó a "70 años de trayectoria para acompañarte", cuyo dato
 * vive ahora en el sello +70 de la esquina.
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

      <div className="max-w-2xl lg:max-w-4xl mx-auto text-center space-y-7 sm:space-y-9 lg:space-y-[clamp(0.9rem,3.2vh,2.25rem)]">
        {/* The mark, and under it the logo's own tagline cut to one word.
            The full logo image says "Oportunidades inmobiliarias"; on
            24-sep-2026 Tomy kept only "Inmobiliaria", so the tagline is text
            now, set like the one in the image — navy, serif, caps — rather
            than a second image. The isotipo is the same 3395px wide as the
            full logo and 1590/2540 = 0.626 as tall; the heights below were the old
            ones times 0.626, then 25% bigger at Tomy's word (24-sep). */}
        <div
          className="flex flex-col items-center gap-1.5 home-rise lg:gap-[clamp(0.3rem,0.9vh,0.6rem)]"
          style={{ animationDelay: "0ms" }}
        >
          <BrandLogo
            variant="isotipo"
            size={94}
            priority
            className="h-[5.4rem] w-auto lg:h-[clamp(4.3rem,14.9vh,8.6rem)]"
          />
          <span
            className="font-heading font-semibold uppercase leading-none tracking-[0.14em] text-[0.95rem] lg:text-[clamp(0.95rem,2.35vh,1.5rem)]"
            style={{ color: "var(--brand-heading)" }}
          >
            Inmobiliaria
          </span>
        </div>

        {/* Eyebrow — el apellido, en dorado (Tomy, 24-sep-2026). Caps +
            tracking ancho, el chispazo editorial sin gritar. Antes decía
            "Inmobiliaria · Zona Sur GBA"; "Inmobiliaria" pasó a la marca de
            arriba y las zonas ya están en la línea de abajo. */}
        <p
          className="text-[0.7rem] sm:text-xs font-medium uppercase tracking-[0.25em] home-rise"
          style={{
            color: "var(--brand-accent)",
            animationDelay: "140ms",
          }}
        >
          Martino
        </p>

        {/* Headline — Fraunces italic, la línea protagónica. El
            home-rise-hero le da el peso de entrada más pronunciado (más
            recorrido + blur que se aclara). */}
        <h1
          className="font-heading font-medium text-3xl sm:text-5xl lg:text-[clamp(2.5rem,7.2vh,3.9rem)] leading-[1.05] tracking-tight italic text-balance home-rise-hero"
          style={{
            color: "var(--brand-heading)",
            animationDelay: "260ms",
          }}
        >
          Vos decidís
          <br />
          {/* "te ayuda" travels together: at 375px the line broke before
              "ayuda" and left it alone on a third line. text-balance does not
              help across a forced <br />. */}
          nuestra experiencia <span className="whitespace-nowrap">te ayuda</span>
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
                {/* The dot stays glued to the name before it (no-break space)
                    and the line may break after it, so a wrapped line never
                    starts with a dot. Without a breakable space here the
                    whole row was one unbreakable run and overflowed at 375. */}
                {i > 0 && (
                  <>
                    {"\u00a0"}
                    <Bullet />{" "}
                  </>
                )}
                {/* A place name is one unit: "José Mármol" split over two lines
                    at 375px read as two places. */}
                <span className="whitespace-nowrap">{z}</span>
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

      <TrajectorySeal />

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
 * "+70 años", a small stamp fixed to the bottom-left corner — the WhatsApp
 * button's mirror on the other side (Tomy, 24-sep-2026: "un sello muy sobrio y
 * delicado", then "abajo a la izquierda, como el wpp pero del lado
 * contrario"). It carries the 70 years the old headline used to say, now that
 * the headline says something else. Landing only.
 *
 * Its centre sits at the same height as the WhatsApp button's, and it has a
 * background of its own: fixed, it floats over whatever scrolls beneath.
 *
 * A thin gold ring with a second, fainter one inside — the double rule of a
 * stamp — and the number in Fraunces over a tracked caps line. Tilted a
 * little, like something pressed on paper. The tilt lives on the inner
 * element: `home-rise` animates the wrapper's `transform`, and a keyframe
 * that writes `transform` would wipe a `rotate` class on the same element.
 */
function TrajectorySeal() {
  return (
    <div
      className="fixed bottom-4 left-4 z-40 home-rise sm:left-6"
      style={{ animationDelay: "900ms" }}
    >
      <div
        className="relative grid size-14 -rotate-[8deg] place-items-center rounded-full border bg-background/90 shadow-sm backdrop-blur-sm sm:size-16"
        style={{ borderColor: "color-mix(in srgb, var(--brand-gold) 70%, transparent)" }}
      >
        <span
          aria-hidden
          className="absolute inset-[3px] rounded-full border"
          style={{ borderColor: "color-mix(in srgb, var(--brand-gold) 35%, transparent)" }}
        />
        <span className="sr-only">Más de 70 años de trayectoria</span>
        <span aria-hidden className="flex flex-col items-center leading-none">
          <span
            className="font-heading italic text-lg sm:text-xl"
            style={{ color: "var(--brand-heading)" }}
          >
            +70
          </span>
          <span
            className="mt-0.5 text-[0.5rem] font-medium uppercase tracking-[0.22em] sm:text-[0.55rem]"
            style={{ color: "var(--brand-accent)" }}
          >
            años
          </span>
        </span>
      </div>
    </div>
  );
}

/**
 * Decorative middle-dot separator between zona names. Lower opacity than
 * the names themselves so it visually recedes (the names are the data,
 * the dot is connective tissue).
 */
function Bullet() {
  return (
    <span aria-hidden className="opacity-40 mx-0.5">
      ·
    </span>
  );
}
