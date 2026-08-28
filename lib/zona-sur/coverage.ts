import type { LatLng } from "@/lib/map/tiles";

/**
 * The ground the agency actually works.
 *
 * A heptagon over the Lanús – Banfield – Lomas de Zamora – Temperley corridor:
 * the stretch along the Roca line where the inventory and the local knowledge
 * are. Not a cadastral boundary and not pretending to be one — it is the
 * answer to "¿dónde trabajan?", drawn on real ground so the answer is
 * checkable instead of decorative.
 *
 * Seven vertices rather than a traced municipal outline on purpose. A real
 * border at this scale is a jagged line that reads as noise in a 206-pixel
 * box, and tracing one would suggest a precision the claim doesn't have: the
 * agency doesn't stop at a line on a map. An odd number of sides also keeps
 * the shape from reading as a regular hexagon — a drawn boundary, not an
 * icon.
 */
export const COVERAGE_AREA: LatLng[] = [
  { lat: -34.681, lng: -58.402 }, // N — Lanús, hacia Avellaneda
  { lat: -34.699, lng: -58.339 }, // NE — Lanús Este
  { lat: -34.745, lng: -58.328 }, // E — Banfield / Villa Centenario
  { lat: -34.788, lng: -58.348 }, // SE — Temperley / Llavallol
  { lat: -34.812, lng: -58.404 }, // S — Turdera
  { lat: -34.779, lng: -58.463 }, // SO — Lomas oeste
  { lat: -34.699, lng: -58.456 }, // NO — Lanús oeste
];

/**
 * The localities the area is named by, in the order they read on the map,
 * north to south. Shown as the diagram's caption.
 */
export const COVERAGE_LABEL = "Lanús · Banfield · Lomas de Zamora";
