/**
 * Shared types for all property scrapers (Zonaprop, Argenprop, etc.).
 * Each scraper normalizes its raw HTML output to this shape, and the
 * persistence layer handles upserting into the `properties` table.
 */

export type PropertySource =
  | "zonaprop"
  | "argenprop"
  | "mercadolibre"
  | "owner_direct"
  | "agency";

export type PropertyType =
  | "casa"
  | "departamento"
  | "ph"
  | "lote"
  | "local";

export type OperationType = "venta" | "alquiler";

export type PriceCurrency = "USD" | "ARS";

/**
 * A property as extracted from a listings source. Fields are optional
 * because not every source provides everything; the persistence layer
 * fills in nulls as needed.
 */
export interface ScrapedProperty {
  /** Source identifier */
  source: PropertySource;
  /** Source's own ID for this listing (e.g. Zonaprop's data-id) */
  externalId: string;
  /** Original listing URL */
  url: string;

  /** Buenos Aires partido (e.g. "Lomas de Zamora") */
  partido?: string;
  /** Street + number (e.g. "Juan de Garay al 3500") */
  address?: string;
  /** Free-text location string from the source (e.g. "Temperley, Lomas de Zamora") */
  locationText?: string;

  propertyType?: PropertyType;
  operationType?: OperationType;

  priceAmount?: number;
  priceCurrency?: PriceCurrency;

  /** Surface in m² */
  surfaceTotal?: number;
  surfaceCovered?: number;

  rooms?: number;
  bedrooms?: number;
  bathrooms?: number;
  garages?: number;

  description?: string;
  /** Array of photo URLs (cdn-hosted) */
  photos?: string[];
}

/**
 * Result of a scraper run.
 */
export interface ScraperRunResult {
  source: PropertySource;
  partido: string;
  /** Number of properties found (after deduplication within the run) */
  scrapedCount: number;
  /** Number of new properties inserted to the DB */
  insertedCount: number;
  /** Number of properties updated (some field changed) */
  updatedCount: number;
  /** Number of properties marked inactive (no longer in source) */
  deactivatedCount: number;
  /** Number of errors encountered (logged, not thrown) */
  errorCount: number;
  /** Total duration in ms */
  durationMs: number;
}
