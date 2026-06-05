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
export function HomeHero() {
  return (
    <section className="relative px-4 pt-12 pb-14 sm:pt-20 sm:pb-20 overflow-hidden">
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

      <div className="max-w-2xl mx-auto text-center space-y-7 sm:space-y-9">
        {/* Logo */}
        <div
          className="flex justify-center home-rise"
          style={{ animationDelay: "0ms" }}
        >
          <BrandLogo variant="full" size={110} priority />
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
          className="font-heading font-medium text-3xl sm:text-5xl leading-[1.05] tracking-tight italic home-rise-hero"
          style={{
            color: "var(--brand-heading)",
            animationDelay: "260ms",
          }}
        >
          La información del martillero,
          <br />
          en tus manos.
        </h1>

        {/* Zonas con middle-dot, sin caja final con coma — más editorial. */}
        <p
          className="text-sm sm:text-base text-muted-foreground home-rise"
          style={{ animationDelay: "440ms" }}
        >
          <span>Lomas</span>
          <Bullet />
          <span>Banfield</span>
          <Bullet />
          <span>Lanús</span>
          <Bullet />
          <span>Avellaneda</span>
          <Bullet />
          <span>Quilmes</span>
        </p>

        {/* CTA. El chevron se desplaza 2px al hover (§2.2 — premia
            curiosidad). En mobile no hay hover; tap te lleva al ancla. */}
        <div
          className="pt-2 flex justify-center home-rise"
          style={{ animationDelay: "600ms" }}
        >
          <a
            href="#catalogo"
            className={cn(
              buttonVariants({ size: "lg" }),
              "gap-1.5 group px-6",
            )}
          >
            Ver propiedades
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </div>

      {/* Scroll hint — chevron pulsando suavemente. */}
      <div
        aria-hidden
        className="mt-10 sm:mt-14 flex justify-center home-rise"
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
