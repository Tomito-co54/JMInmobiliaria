/**
 * URL builders for Zonaprop search pages.
 *
 * Zonaprop URL patterns (observed Nov 2026):
 *   - All properties for sale in a partido:
 *       https://www.zonaprop.com.ar/inmuebles-venta-{slug}.html
 *   - Pagination: append `-pagina-{n}` before `.html`
 *       https://www.zonaprop.com.ar/inmuebles-venta-{slug}-pagina-2.html
 *
 * Slugs use lowercase + dashes (e.g. "lomas-de-zamora").
 */

/** Partidos in Zona Sur GBA we want to scrape, with their Zonaprop URL slugs. */
export const PARTIDOS_SLUGS: Record<string, string> = {
  "Lomas de Zamora": "lomas-de-zamora",
  Banfield: "banfield",
  Lanús: "lanus",
  Avellaneda: "avellaneda",
  Quilmes: "quilmes",
};

const BASE_URL = "https://www.zonaprop.com.ar";

export function buildListUrl(partido: string, page: number = 1): string {
  const slug = PARTIDOS_SLUGS[partido];
  if (!slug) {
    throw new Error(`Unknown partido: ${partido}`);
  }
  if (page === 1) {
    return `${BASE_URL}/inmuebles-venta-${slug}.html`;
  }
  return `${BASE_URL}/inmuebles-venta-${slug}-pagina-${page}.html`;
}

/** Convert a relative path like /propiedades/clasificado/... to a full URL */
export function absolutize(href: string): string {
  if (href.startsWith("http")) return href;
  if (href.startsWith("//")) return `https:${href}`;
  if (href.startsWith("/")) return `${BASE_URL}${href}`;
  return `${BASE_URL}/${href}`;
}
