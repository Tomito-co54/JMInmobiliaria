import type { Colega, ColegaPlatform } from "./index";
import { listingIdsFromPage, normalizeListing, parseListingPage, type Normalized } from "./buscadorprop";
import { listingEntriesFromPage, normalizeAd, parseAdPage } from "./pixel-inmobiliario";

/**
 * One shape for the two platforms the partners' sites run on, so the sync
 * (scripts/sincronizar-colegas.ts) walks any of them the same way: page the
 * listing until it comes back empty, read each property, normalize it.
 *
 * Pure. The readers themselves are lib/colegas/buscadorprop and
 * lib/colegas/pixel-inmobiliario; this is only the dispatch.
 */

export interface ListingEntry {
  /** The partner's stable id for the listing: `properties.external_id`. */
  id: string;
  /** Where its page is. */
  url: string;
  /** The listing page already marks it sold (a ribbon on the card). */
  sold?: boolean;
}

export interface PlatformReader {
  /** The listing page N, and whether it answers JSON (BuscadorProp's infinite scroll). */
  listingUrl(colega: Colega, page: number): string;
  listingIsJson: boolean;
  /** Entries on one listing page; none past the last page. */
  entries(body: string, colega: Colega): ListingEntry[];
  /**
   * One property page as a row. `sold` is a listing the partner keeps on
   * their site with a "Vendido" ribbon: seen, so not gone, but not for sale.
   */
  read(html: string, id: string, colega: Colega, placeNames: readonly string[]): Normalized & { sold: boolean };
}

const buscadorprop: PlatformReader = {
  listingUrl: (colega, page) => `${colega.siteUrl}/propiedades?infinito=1&pagina=${page}`,
  listingIsJson: true,
  entries: (body, colega) => listingIdsFromPage(body).map((id) => ({ id, url: `${colega.siteUrl}/propiedad/${id}` })),
  read: (html, id, colega, placeNames) => ({
    ...normalizeListing(parseListingPage(html, id), placeNames, new Date(), colega.scrubWords),
    sold: false,
  }),
};

/** The listing takes the partner's account id on the platform (`Colega.account`). */
const pixelInmobiliario: PlatformReader = {
  listingUrl: (colega, page) => `${colega.siteUrl}/listing?user_id=${colega.account ?? ""}&purpose=sale&page=${page}`,
  listingIsJson: false,
  entries: (body) => listingEntriesFromPage(body).map((e) => ({ id: e.code, url: e.url, sold: e.sold })),
  read: (html, id, colega, placeNames) => normalizeAd(parseAdPage(html, id), placeNames, new Date(), colega.scrubWords),
};

const READERS: Record<ColegaPlatform, PlatformReader> = {
  buscadorprop,
  "pixel-inmobiliario": pixelInmobiliario,
};

export function readerFor(colega: Colega): PlatformReader {
  return READERS[colega.platform];
}
