/**
 * Canonical paths to brand assets in /public/brand/.
 *
 * Naming: the SVGs live with their original filenames so they're easy to
 * cross-reference with the brand kit. Components import these constants
 * rather than hard-coding paths, so a future rename only touches one file.
 */

export const BRAND_ASSETS = {
  /** Full logo (J+M isotipo + "Oportunidades Inmobiliarias" text). Navy on white. */
  logoNavy: "/brand/oportunidades_inmobiliarias_logo.svg",
  /** Same, inverted to white. Use on navy / dark backgrounds. */
  logoWhite: "/brand/oportunidades_inmobiliarias_logo_white.svg",
  /** Isotipo only (no text). Navy on white. Best for compact spots. */
  isotipoNavy: "/brand/oportunidades_inmobiliarias_isotipo.svg",
  /** Isotipo only, white. */
  isotipoWhite: "/brand/oportunidades_inmobiliarias_isotipo_white.svg",
} as const;

/** Brand display strings. */
export const BRAND = {
  name: "Jotaeme",
  tagline: "Oportunidades Inmobiliarias",
} as const;
