/**
 * Canonical list of partidos in our Zona Sur GBA service area.
 *
 * Used by:
 *   - Onboarding + edit forms (zone preference selector)
 *   - (eventually) the search page filters
 *
 * Property rows store this same string in `properties.partido`. If a
 * partido appears in our data but not here, the zone sub-score treats it
 * as "not in user's list" rather than crashing — but we should keep this
 * synced with the scraping coverage.
 */

export const PARTIDOS_ZONA_SUR = [
  "Lomas de Zamora",
  "Avellaneda",
  "Lanús",
  "Quilmes",
  "Almirante Brown",
  "Esteban Echeverría",
  "Ezeiza",
] as const;

export type PartidoZonaSur = (typeof PARTIDOS_ZONA_SUR)[number];

export function isKnownPartido(s: string): s is PartidoZonaSur {
  return (PARTIDOS_ZONA_SUR as readonly string[]).includes(s);
}
