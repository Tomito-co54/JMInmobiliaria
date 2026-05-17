/**
 * URL builders for Trezza Propiedades listings.
 * https://www.trezzapropiedades.com.ar/propiedades/{slug}
 *
 * Trezza uses infinite scroll, not pagination, so URLs don't include a page number.
 */

export const PARTIDOS_SLUGS: Record<string, string> = {
  "Lomas de Zamora": "lomas-de-zamora",
  Banfield: "banfield",
  Temperley: "temperley",
  Lanús: "lanus",
  Avellaneda: "avellaneda",
  Quilmes: "quilmes",
};

const BASE_URL = "https://www.trezzapropiedades.com.ar";

export function buildListUrl(partido: string): string {
  const slug = PARTIDOS_SLUGS[partido];
  if (!slug) {
    throw new Error(`Unknown Trezza partido: ${partido}`);
  }
  return `${BASE_URL}/propiedades/${slug}`;
}

export function absolutize(href: string): string {
  if (href.startsWith("http")) return href;
  if (href.startsWith("//")) return `https:${href}`;
  if (href.startsWith("/")) return `${BASE_URL}${href}`;
  return `${BASE_URL}/${href}`;
}
