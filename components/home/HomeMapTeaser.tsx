import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { Reveal } from "@/components/shared/Reveal";
import { NavPending } from "@/components/shared/NavPending";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCatalogPins, type CatalogPin } from "@/lib/db/properties";
import {
  BASEMAP_ATTRIBUTION,
  BASEMAP_SUPERSAMPLE,
  BASEMAP_TILE_PIXELS,
  placedTilesForBox,
  projectToView,
  zoomForSpan,
} from "@/lib/map/tiles";

/**
 * The landing's window onto the map: the published listings as pins on real
 * ground, and one way in — the whole box is a link to the catalog with the
 * map open.
 *
 * No Leaflet here, on purpose. The landing is the page that has to load
 * fastest and this box is a still: the tiles are laid out with the same
 * arithmetic the coverage block uses (lib/map/tiles), and the pins are
 * projected with the same function as the tiles, so each one sits on its
 * block. Panning, zooming and choosing an area happen on /propiedades, where
 * the map is worth its 45 kB.
 *
 * Renders nothing when no published listing has a position — a map with no
 * pins would be a promise about nothing.
 */

const BOX = { width: 320, height: 200 };
const METERS_PER_DEGREE = 111_320;
/** Never tighter than this, so one building does not become a satellite photo of itself. */
const MIN_SPAN_METERS = 1200;
const PADDING = 1.6;
const MAX_ZOOM = 16;

function frame(pins: CatalogPin[]) {
  const lats = pins.map((p) => p.lat);
  const lngs = pins.map((p) => p.lng);
  const center = {
    lat: (Math.max(...lats) + Math.min(...lats)) / 2,
    lng: (Math.max(...lngs) + Math.min(...lngs)) / 2,
  };
  const cos = Math.cos((center.lat * Math.PI) / 180);
  const latSpan = Math.max((Math.max(...lats) - Math.min(...lats)) * METERS_PER_DEGREE, MIN_SPAN_METERS);
  const lngSpan = Math.max((Math.max(...lngs) - Math.min(...lngs)) * METERS_PER_DEGREE * cos, MIN_SPAN_METERS);

  // Ground taken at supersample scale and drawn at box size — see
  // BASEMAP_SUPERSAMPLE and the coverage block, which does the same.
  const s = BASEMAP_SUPERSAMPLE;
  const zoom = Math.min(
    zoomForSpan(center.lat, lngSpan * PADDING, BOX.width * s),
    zoomForSpan(center.lat, latSpan * PADDING, BOX.height * s),
    MAX_ZOOM,
  );
  const tiles = placedTilesForBox(center, zoom, BOX);
  const dots = pins.map((p) => {
    const q = projectToView(p, center, zoom, BOX.width * s, BOX.height * s);
    return {
      id: p.id,
      address: p.address,
      left: `${((q.x / s / BOX.width) * 100).toFixed(2)}%`,
      top: `${((q.y / s / BOX.height) * 100).toFixed(2)}%`,
    };
  });
  return { tiles, dots };
}

export async function HomeMapTeaser() {
  const pins = await getCatalogPins();
  if (pins.length === 0) return null;
  const { tiles, dots } = frame(pins);
  const href = "/propiedades?mapa=1";

  return (
    <section className="px-4 py-16 sm:py-24">
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-y-10 md:gap-x-12 items-center">
        <Reveal direction="left" className="order-2 md:order-1">
          <p
            className="text-[0.7rem] sm:text-xs font-medium uppercase tracking-[0.22em] mb-3"
            style={{ color: "var(--brand-accent)" }}
          >
            Buscá por zona
          </p>
          <h2
            className="font-heading font-medium text-3xl sm:text-4xl leading-[1.1] tracking-tight"
            style={{ color: "var(--brand-heading)" }}
          >
            Marcá el área en el mapa y te mostramos qué hay.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-muted-foreground max-w-md">
            Cada propiedad está ubicada en su parcela, no en la esquina más cercana. Encuadrá el
            barrio que te interesa y el catálogo se queda con lo que entra.
          </p>
          <Link
            href={href}
            className={cn(
              buttonVariants({ size: "lg" }),
              "group relative mt-7 min-h-12 w-fit gap-1.5 px-7 text-base",
              "transition-transform duration-200 ease-out motion-safe:hover:scale-[1.03] motion-safe:active:scale-[0.97]",
            )}
          >
            Abrir el mapa
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
            <NavPending className="inset-x-4 bottom-1" />
          </Link>
        </Reveal>

        {/* The still. A link and not a map: the first tap should open the
            real thing, not fight a frozen picture for a gesture. */}
        <Reveal direction="right" className="order-1 md:order-2">
          <Link
            href={href}
            aria-label={`Abrir el mapa con ${pins.length} ${pins.length === 1 ? "propiedad" : "propiedades"}`}
            className="group relative block aspect-[8/5] overflow-hidden rounded-3xl border bg-muted shadow-lg transition-shadow hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {/* Same basemap treatment as the coverage block: barely filtered,
                inverted in dark mode. */}
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.92] contrast-[0.88] transition-transform duration-700 ease-out group-hover:scale-[1.03] dark:opacity-[0.5] dark:invert dark:hue-rotate-180"
            >
              {tiles.map((t) => (
                <Image
                  key={t.url}
                  src={t.url}
                  alt=""
                  width={BASEMAP_TILE_PIXELS}
                  height={BASEMAP_TILE_PIXELS}
                  unoptimized
                  className="absolute max-w-none"
                  style={{ left: t.left, top: t.top, width: t.width, height: t.height }}
                />
              ))}
            </div>

            {/* The pins, projected with the same function as the tiles. */}
            {dots.map((d) => (
              <span
                key={d.id}
                title={d.address ?? undefined}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: d.left, top: d.top }}
              >
                <span
                  className="block size-3.5 rounded-full ring-2 ring-white shadow-md"
                  style={{ backgroundColor: "var(--brand-navy)" }}
                />
              </span>
            ))}

            <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full border bg-background/95 px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur">
              <MapPin className="size-3.5" style={{ color: "var(--brand-gold)" }} aria-hidden />
              {pins.length} {pins.length === 1 ? "propiedad" : "propiedades"} en el mapa
            </span>
          </Link>
          {/* Tile credit: a licence term, not a caption. */}
          <p className="mt-1.5 text-center text-[0.55rem] tracking-wide text-muted-foreground/60">
            {BASEMAP_ATTRIBUTION}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
