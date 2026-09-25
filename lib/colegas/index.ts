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
 * Tomy, 25-sep-2026: the family's other agency, José Martino Inmobiliaria in
 * Villa del Dique (Córdoba), comes in the same way — "lo mismo que con
 * Laudani, pero sin sello": it is the family's, so nothing on the card says
 * it is anyone else's. Their site runs on another platform (Pixel
 * Inmobiliario), so it has its own reader.
 *
 * Adding a partner is an entry here plus a reader for its platform
 * (lib/colegas/platforms); scripts/sincronizar-colegas.ts runs every entry.
 */
export type ColegaPlatform = "buscadorprop" | "pixel-inmobiliario";

export interface Colega {
  /** The value of `properties.partner`. */
  key: string;
  name: string;
  /** Which reader turns their site into rows (lib/colegas/platforms). */
  platform: ColegaPlatform;
  /**
   * The seal on their listings: their logo, served from /public so it never
   * depends on the partner's CDN. Absent for a partner whose listings are
   * shown with no mark at all (the family's own agency elsewhere).
   */
  seal: { logo: string; width: number; height: number } | null;
  /** Where the sync reads the catalog. Never rendered on a public page. */
  siteUrl: string;
  /**
   * The partner's account on their platform, when the listing URL needs it
   * (Pixel Inmobiliario: the `user_id` its own menu links carry).
   */
  account?: string;
  /**
   * Words that name the partner in their own copy, beyond what the generic
   * contact scrub catches (a phone, an email, a web address). A sentence
   * with one of these goes: the contact on this site is Tomy's.
   */
  scrubWords: readonly string[];
  /**
   * Whether their pins can be placed on ARBA parcels to group units into
   * buildings (lib/colegas/buildings). Only for a catalog in the province of
   * Buenos Aires: the cadastre knows nothing about Córdoba, and asking it
   * would cache a miss per listing for nothing.
   */
  cadastre: boolean;
}

export const COLEGAS: Record<string, Colega> = {
  laudani: {
    key: "laudani",
    name: "Laudani & Cía",
    platform: "buscadorprop",
    seal: { logo: "/partners/laudani.png", width: 300, height: 150 },
    siteUrl: "https://laudaniycia.com.ar",
    scrubWords: ["laudani"],
    cadastre: true,
  },
  martino_villa_del_dique: {
    key: "martino_villa_del_dique",
    name: "José Martino Inmobiliaria (Villa del Dique)",
    platform: "pixel-inmobiliario",
    seal: null,
    siteUrl: "https://www.josemartinoinmobiliaria.com.ar",
    account: "1742",
    // Their descriptions close with "JOSÉ MARTINO INMOBILIARIA / El nombre
    // que marca la diferencia" and a "Consultanos…": another agency's sign-off
    // under Tomy's WhatsApp button.
    scrubWords: [
      "martino",
      "el nombre que marca la diferencia",
      "consultanos",
      "consúltenos",
      "consultenos",
      "coordiná tu visita",
    ],
    cadastre: false,
  },
};

export function colegaFor(partner: string | null | undefined): Colega | null {
  return partner ? (COLEGAS[partner] ?? null) : null;
}
