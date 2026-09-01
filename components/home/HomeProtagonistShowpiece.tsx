"use client";

import Image from "next/image";
import Link from "next/link";
import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils";

/**
 * Client island for the protagonist showpiece — the photo that breaks out of
 * the quadrant (§2.6).
 *
 * Why a client island: the parent HomeProtagonist is a Server Component and
 * lives BELOW the fold. The old version used `animate-in` (fires on mount),
 * so by the time you scrolled here the entrance had already finished — it
 * looked static. This runs the gesture on SCROLL into view instead, so the
 * photo visibly "arrives": it rises + scales up + rotates into its final
 * -2.5° tilt while the shadow deepens (§2.4 settle, not a flat fade). The
 * medallion and the bare corner land after, with weight (§2.1 — the serious
 * datum sits on top of the audacious composition).
 *
 * transform/opacity only, motion-safe via useInView's reduced-motion-aware
 * transitions (the hidden state is only applied when motion is allowed).
 */
export function HomeProtagonistShowpiece({
  id,
  cover,
  behind,
  headline,
}: {
  id: string;
  cover: string | null;
  /**
   * La segunda foto de la propiedad, la que va detrás.
   *
   * El lugar existía desde el principio como un recuadro decorativo vacío, y
   * se leía como una imagen que no cargó — reportado tres veces. No era un
   * problema de color ni de tamaño: faltaba la foto. Null cuando la propiedad
   * tiene una sola, y entonces no se dibuja nada: un recuadro vacío es
   * justamente lo que se estaba arreglando.
   */
  behind: string | null;
  headline: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.35 });

  return (
    // pt-8/pr-4: el aire que necesita la foto de atrás para asomar sin que
    // la recorte el borde del bloque.
    <div
      ref={ref}
      className="relative mx-auto w-full max-w-sm pt-8 pr-4 md:max-w-none"
    >
      {/* La segunda foto, detrás y asomando por arriba a la derecha.
          Dos imágenes de la misma propiedad, una pisando a la otra.

          Más chica (72%) y con más inclinación que la de adelante, para que
          se lea como una foto aparte y no como un duplicado corrido. Y con
          `z-0` contra el `z-10` de la de adelante: las dos están posicionadas,
          así que sin z explícito el orden lo decide el DOM, que es
          exactamente la clase de cosa que se rompe sola cuando alguien mueve
          un bloque de lugar.

          Entra antes y más despacio que la principal, así el ojo lee la
          profundidad (§2.1) en vez de ver dos cosas aparecer juntas. */}
      {behind && (
        <div
          aria-hidden
          className={cn(
            "absolute -top-5 -right-2 z-0 w-[72%] aspect-[4/3] overflow-hidden rounded-2xl",
            "ring-[5px] ring-background shadow-xl",
            "motion-safe:transition-all motion-safe:duration-[900ms] motion-safe:ease-out",
            inView
              ? "opacity-100 translate-y-0 rotate-[5deg] scale-100"
              : "motion-safe:opacity-0 motion-safe:translate-y-6 motion-safe:rotate-0 motion-safe:scale-95",
          )}
        >
          <Image
            src={behind}
            alt=""
            fill
            sizes="(max-width: 768px) 64vw, 320px"
            className="object-cover"
          />
        </div>
      )}

      {/* La foto. LLEGA: desde más abajo, más chica y sin rotar → hasta su
          pose inclinada con sombra. El hover la levanta y la endereza un
          poco (§2.2).

          Queda en el flujo (no absolute) y es la que le da altura al bloque;
          la de atrás se posiciona contra ella. */}
      <Link
        href={`/p/${id}`}
        aria-label={`Ver ${headline}`}
        className="group relative z-10 block focus-visible:outline-none"
      >
        <div
          className={cn(
            "relative aspect-[4/3] rounded-2xl overflow-hidden ring-[6px] ring-background",
            "motion-safe:transition-all motion-safe:duration-[900ms]",
            "group-hover:rotate-[-1deg] group-hover:scale-[1.02] group-focus-visible:rotate-[-1deg]",
            inView
              ? "opacity-100 translate-y-0 rotate-[-2.5deg] scale-100 shadow-2xl"
              : "motion-safe:opacity-0 motion-safe:translate-y-10 motion-safe:rotate-0 motion-safe:scale-90 shadow-none",
          )}
          style={{
            transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
            transitionDelay: inView ? "180ms" : "0ms",
          }}
        >
          {cover ? (
            <Image
              src={cover}
              alt={headline}
              fill
              sizes="(max-width: 768px) 88vw, 440px"
              className="object-cover"
              priority
            />
          ) : (
            <div
              className="size-full grid place-items-center"
              style={{ backgroundColor: "var(--brand-icon-bg)" }}
            />
          )}
        </div>
      </Link>

      {/* Aquí colgaba el medallón del Quality Score. Era el último resto y se
          había defendido como gesto de diseño (§2.1, el dato serio pisando la
          foto) — pero un gesto que muestra un número que no se explica en
          ningún lado sigue siendo el número mostrado. La foto rompiendo el
          cuadrante es el gesto; el medallón era solo lo que colgaba de él. */}
    </div>
  );
}
