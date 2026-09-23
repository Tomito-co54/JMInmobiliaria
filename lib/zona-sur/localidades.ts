import type { PartidoZonaSur } from "./partidos";

/**
 * The localidades a listing can be in, per partido.
 *
 * A closed vocabulary for the same reason the broker tags are one
 * (lib/property/tags.ts): the catalog's search intro offers every localidad it
 * finds as a button, so free text would turn "Banfield", "banfield" and
 * "Banfiel" into three buttons — and a typo into a published place nobody can
 * pick. Adding one is a line here, no migration: the column is plain text and
 * the check lives in the validator and the sync.
 *
 * Why a localidad at all, when the partido is already stored: almost the whole
 * catalog is in Lomas de Zamora, so a "where" question by partido has one
 * answer. The visitor thinks in Banfield, Temperley, Lomas centro.
 *
 * Some names exist in two partidos (Gerli, San José, San Francisco Solano,
 * Canning) because the localidad straddles the boundary; each partido lists it.
 */
export const LOCALIDADES_POR_PARTIDO: Record<PartidoZonaSur, readonly string[]> = {
  "Lomas de Zamora": [
    "Lomas de Zamora",
    "Banfield",
    "Temperley",
    "Turdera",
    "Llavallol",
    "Ingeniero Budge",
    "Villa Fiorito",
    "Villa Centenario",
    "San José",
    "Villa Albertina",
    "Parque Barón",
  ],
  Avellaneda: [
    "Avellaneda",
    "Dock Sud",
    "Sarandí",
    "Villa Domínico",
    "Wilde",
    "Gerli",
    "Piñeyro",
    "Crucecita",
  ],
  Lanús: [
    "Lanús Este",
    "Lanús Oeste",
    "Remedios de Escalada",
    "Gerli",
    "Monte Chingolo",
    "Valentín Alsina",
  ],
  Quilmes: [
    "Quilmes",
    "Bernal",
    "Don Bosco",
    "Ezpeleta",
    "San Francisco Solano",
    "Villa La Florida",
  ],
  "Almirante Brown": [
    "Adrogué",
    "Burzaco",
    "Claypole",
    "Don Orione",
    "Glew",
    "José Mármol",
    "Longchamps",
    "Malvinas Argentinas",
    "Ministro Rivadavia",
    "Rafael Calzada",
    "San José",
    "San Francisco Solano",
  ],
  "Esteban Echeverría": ["Monte Grande", "Luis Guillón", "El Jagüel", "9 de Abril", "Canning"],
  Ezeiza: ["Ezeiza", "Tristán Suárez", "Carlos Spegazzini", "La Unión", "Canning"],
};

/** Every known localidad, once, sorted for display. */
export const LOCALIDADES: readonly string[] = [
  ...new Set(Object.values(LOCALIDADES_POR_PARTIDO).flat()),
].sort((a, b) => a.localeCompare(b, "es"));

const fold = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/**
 * The canonical spelling of a localidad, or null when it is not one we know.
 * Case and accents are forgiven — "banfield", "LANUS OESTE" — because they
 * come from a spreadsheet; a different word is not.
 *
 * With a partido, the localidad has to belong to it: Temperley in Lanús is a
 * contradiction between two columns, and publishing either would be a guess.
 */
export function canonicalLocalidad(value: string, partido?: string | null): string | null {
  const key = fold(value);
  if (!key) return null;
  const pool =
    partido && partido in LOCALIDADES_POR_PARTIDO
      ? LOCALIDADES_POR_PARTIDO[partido as PartidoZonaSur]
      : LOCALIDADES;
  return pool.find((l) => fold(l) === key) ?? null;
}
