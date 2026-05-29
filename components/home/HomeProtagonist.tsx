import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { getFeaturedProperty } from "@/lib/db/properties";
import { getScoreBand } from "@/lib/scoring/bands";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The home protagonista — Jotaeme's brand-signature gesture (Block 3 del
 * rediseño de la home).
 *
 * Direction-de-arte references:
 *   §2.6 "el recorte que sobresale del cuadrante": a rigid tinted quadrant
 *        sits behind (the "grid invisible rígido que ordena el caos") and
 *        the property photo BREAKS OUT of its margin — offset, rotated,
 *        framed, shadowed — so it visibly "sobresale del cuadrante". This
 *        is the punctual, protagonist hit of the effect (the doc warns:
 *        si todo rompe el cuadrante, nada lo rompe — so ONLY here).
 *   §2.1 profundidad eje Z con intención: the layered planes (quadrant <
 *        photo < score medallion) and the slight rotation create depth
 *        without 3D; the score overlapping the photo *jerarquiza* the
 *        credibility anchor.
 *   §2.2 hover que revela: the framed photo lifts + un-rotates a touch on
 *        hover; en mobile el tap simplemente navega a la propiedad.
 *   §1   "tech con alma": Fraunces protagónico en el headline (la
 *        dirección), Inter para datos; el score y ARBA son el ancla seria
 *        que le da permiso a la forma para ser audaz.
 *   §4   performance: solo transform/opacity (GPU) + un PNG vía next/image;
 *        motion-safe respeta prefers-reduced-motion. Gana mobile.
 *
 * Asset honesto: §2.6 describe el ideal como PNG recortado a contorno
 * (fondo removido). Hoy las fotos son rectangulares, así que el gesto se
 * ejecuta como composición editorial — la foto enmarcada que rompe el
 * cuadrante. Cuando exista un cut-out a contorno, reemplaza el frame de la
 * foto sin tocar el resto de la composición.
 *
 * Las 4 preguntas (regla de oro):
 *   1. Confianza ✓ — score + verificación ARBA + martillero implícito; la
 *      audacia de la forma se apoya en ese fondo serio.
 *   2. Intención ✓ — el movimiento revela/jerarquiza la propiedad estrella,
 *      no decora; el gesto es puntual, una sola vez en la página.
 *   3. Gama media ✓ — una imagen + capas CSS, sin canvas ni WebGL.
 *   4. Propio ✓ — la foto rompiendo el cuadrante con el medallón de score
 *      solapado no es de plantilla.
 */

const TYPE_LABELS: Record<string, string> = {
  casa: "Casa",
  departamento: "Departamento",
  ph: "PH",
  lote: "Lote",
  local: "Local",
};

function fmtPrice(amount: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(amount);
}

export async function HomeProtagonist() {
  const p = await getFeaturedProperty();
  // No curated centerpiece → the section simply doesn't exist. The home
  // flows hero → features → catalog without a gap.
  if (!p) return null;

  const cover = p.photos?.[0] ?? null;
  const typeLabel = p.property_type
    ? TYPE_LABELS[p.property_type] ?? p.property_type
    : null;
  const surface = p.surface_arba ?? p.surface_total ?? null;
  const score = p.quality_score_breakdown?.score ?? null;
  const band = getScoreBand(score);
  const headline = p.address ?? [typeLabel, p.partido].filter(Boolean).join(" en ");

  const specs = [
    typeLabel,
    p.rooms !== null ? `${p.rooms} amb` : null,
    p.bedrooms !== null ? `${p.bedrooms} dorm` : null,
    surface !== null ? `${surface} m²` : null,
  ].filter(Boolean);

  return (
    <section className="relative px-4 py-16 sm:py-24 overflow-x-clip">
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-y-14 md:gap-x-10 items-center">
        {/* ---- Text block (the serious anchor) ---- */}
        <div
          className="order-2 md:order-1 flex flex-col motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 duration-700"
          style={{ animationFillMode: "backwards" }}
        >
          <p
            className="text-[0.7rem] sm:text-xs font-medium uppercase tracking-[0.22em] mb-3"
            style={{ color: "var(--brand-accent)" }}
          >
            Propiedad destacada
          </p>

          <h2
            className="font-heading font-medium text-3xl sm:text-4xl leading-[1.1] tracking-tight"
            style={{ color: "var(--brand-heading)" }}
          >
            {headline}
          </h2>

          {p.partido && p.address && (
            <p className="mt-2 text-sm text-muted-foreground">{p.partido}</p>
          )}

          {p.price_amount !== null && p.price_currency ? (
            <p className="mt-5 text-2xl sm:text-3xl font-bold tabular-nums leading-none">
              {p.price_currency} {fmtPrice(p.price_amount)}
            </p>
          ) : (
            <p className="mt-5 text-xl font-bold text-muted-foreground leading-none">
              Consultar precio
            </p>
          )}

          {specs.length > 0 && (
            <p className="mt-3 text-sm text-muted-foreground">{specs.join(" · ")}</p>
          )}

          {/* ARBA verification chip — the credibility anchor in copy form. */}
          {p.partida && (
            <span
              className="mt-5 inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
              style={{
                color: "var(--brand-gold)",
                borderColor: "color-mix(in srgb, var(--brand-gold) 35%, transparent)",
                backgroundColor: "color-mix(in srgb, var(--brand-gold) 8%, transparent)",
              }}
            >
              <ShieldCheck className="size-3.5" />
              Verificada con ARBA
            </span>
          )}

          <Link
            href={`/p/${p.id}`}
            className={cn(buttonVariants({ size: "lg" }), "mt-8 w-fit gap-1.5 group px-6")}
          >
            Ver propiedad
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* ---- Showpiece: la foto que sobresale del cuadrante (§2.6) ---- */}
        <div
          className="order-1 md:order-2 relative mx-auto w-full max-w-sm md:max-w-none motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 duration-700"
          style={{ animationDelay: "150ms", animationFillMode: "backwards" }}
        >
          {/* Rigid quadrant — el grid invisible que ordena el caos aparente.
              Faint catastral-style grid lines hint at the cadastral data
              backbone without shouting. */}
          <div
            aria-hidden
            className="aspect-square rounded-[2rem] border"
            style={{
              backgroundColor: "var(--brand-icon-bg)",
              borderColor: "color-mix(in srgb, var(--brand-navy) 12%, transparent)",
              backgroundImage:
                "linear-gradient(color-mix(in srgb, var(--brand-navy) 5%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--brand-navy) 5%, transparent) 1px, transparent 1px)",
              backgroundSize: "2.25rem 2.25rem",
            }}
          />

          {/* The framed photo, broken out of the quadrant's top/right margin:
              rotated + ring frame + deep shadow. This is the literal gesture.
              (Swap the inner frame for a contour cut-out PNG when available.) */}
          <Link
            href={`/p/${p.id}`}
            aria-label={`Ver ${headline}`}
            className="group absolute -top-6 right-3 sm:-top-8 sm:-right-4 w-[88%] block focus-visible:outline-none"
          >
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden ring-[6px] ring-background shadow-2xl rotate-[-2.5deg] transition-transform duration-500 ease-out group-hover:rotate-[-1deg] group-hover:scale-[1.02] group-focus-visible:rotate-[-1deg]">
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

          {/* Score medallion — overlaps the photo's corner (§2.1 capas). The
              serious data sitting on top of the audacious composition. */}
          {score !== null && (
            <div
              className="absolute -bottom-4 -left-2 sm:-left-5 flex items-center gap-2.5 rounded-2xl border bg-background/95 backdrop-blur px-3.5 py-2.5 shadow-xl motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 duration-700"
              style={{
                borderColor: `color-mix(in srgb, ${band.hex} 40%, transparent)`,
                animationDelay: "500ms",
                animationFillMode: "backwards",
              }}
            >
              <span
                className="text-3xl font-extrabold tabular-nums leading-none"
                style={{ color: band.hex }}
              >
                {score}
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">
                  Quality
                </span>
                <span className="text-xs font-semibold" style={{ color: band.hex }}>
                  {band.label}
                </span>
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
