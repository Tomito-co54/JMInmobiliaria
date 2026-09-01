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
  headline,
}: {
  id: string;
  cover: string | null;
  headline: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.35 });

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-sm md:max-w-none">
      {/* Rigid quadrant — fades/scales in first, the stage the photo breaks
          out of.

          `aspect-[4/3]` y no cuadrado. Cuadrado dejaba 187px de grilla vacía
          debajo de la foto — el 40% del cuadro — y eso no se lee como un
          escenario: se lee como una imagen que no cargó. Tomy lo reportó
          exactamente así ("la segunda imagen no se ve"), y si el dueño lo lee
          como roto, un visitante también.

          El vacío estaba desde siempre, pero lo tapaba el medallón del Quality
          Score, que colgaba abajo a la izquierda y anclaba esa mitad. Al
          sacarlo (Fase 29) quedó desnudo. El gesto de §2.6 no se pierde: la
          foto sigue sobresaliendo por arriba y por la derecha, que es donde
          rompe el cuadrante. */}
      <div
        aria-hidden
        className={cn(
          "aspect-[4/3] rounded-[2rem] motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out",
          inView ? "opacity-100 scale-100" : "motion-safe:opacity-0 motion-safe:scale-95",
        )}
        style={{
          // Un bloque de color de marca, sin grilla y sin borde.
          //
          // Antes era gris claro con una cuadrícula tenue, y eso NO se lee
          // como un escenario: se lee como una imagen que no cargó. Tomy lo
          // reportó dos veces — "la segunda imagen no se ve", "la imagen
          // trasera" — y tenía razón las dos, porque un recuadro claro con
          // grilla es exactamente el dibujo universal de un placeholder.
          //
          // Achicarlo no alcanzaba (ya se había pasado de 40% a 19% de área
          // visible y él lo seguía leyendo igual): el problema no era cuánto
          // se veía sino qué parecía. Un bloque liso en azul de marca se lee
          // como decisión de diseño, que es lo que es.
          backgroundColor: "color-mix(in srgb, var(--brand-navy) 9%, transparent)",
        }}
      />

      {/* The framed photo, broken out of the quadrant. It ARRIVES: from
          lower + smaller + un-rotated → into its tilted, shadowed resting
          pose. Hover still lifts/un-rotates a touch (§2.2). */}
      <Link
        href={`/p/${id}`}
        aria-label={`Ver ${headline}`}
        className="group absolute -top-6 right-3 sm:-top-8 sm:-right-4 w-[88%] block focus-visible:outline-none"
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
