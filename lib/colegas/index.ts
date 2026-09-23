/**
 * Fellow brokers whose catalog the site publishes as its own (source =
 * 'colega', migration 00024).
 *
 * Tomy, 23-sep-2026: Luciano Laudani (Laudani & Cía, Adrogué, matrícula
 * 3162 of the Colegio de Martilleros de Lomas de Zamora) gave him his whole
 * catalog — "todo lo que está en la página tomalo como tuyo, cualquier
 * operación que surja vamos a medias". The listings are mixed into the
 * catalog, carry a small seal with the partner's logo, send every contact to
 * Tomy, and never link back to the partner's site.
 *
 * Adding a partner is an entry here plus a sync that writes its rows
 * (scripts/sincronizar-colegas.ts reads a BuscadorProp site; another
 * platform needs its own reader).
 */
export interface Colega {
  /** The value of `properties.partner`. */
  key: string;
  name: string;
  /** Served from /public so the seal never depends on the partner's CDN. */
  logo: string;
  /** Intrinsic size of the logo, for next/image. */
  logoWidth: number;
  logoHeight: number;
  /** Where the sync reads the catalog. Never rendered on a public page. */
  siteUrl: string;
}

export const COLEGAS: Record<string, Colega> = {
  laudani: {
    key: "laudani",
    name: "Laudani & Cía",
    logo: "/partners/laudani.png",
    logoWidth: 300,
    logoHeight: 150,
    siteUrl: "https://laudaniycia.com.ar",
  },
};

export function colegaFor(partner: string | null | undefined): Colega | null {
  return partner ? (COLEGAS[partner] ?? null) : null;
}
