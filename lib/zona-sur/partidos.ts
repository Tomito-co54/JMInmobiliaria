/**
 * Canonical list of partidos in our Zona Sur GBA service area, each paired
 * with its official ARBA municipal code (3 digits).
 *
 * The ARBA code is the prefix of every `partida` (tax ID) issued in that
 * partido. Used by the property loader to validate the partida format
 * locally before hitting the WFS — catches typos early.
 *
 * Used by:
 *   - Onboarding + edit forms (zone preference selector)
 *   - Admin property loader (partido select + partida validation)
 *   - Eventually search page filters
 *
 * Property rows store the partido NAME in `properties.partido`. The ARBA
 * code lives only here (derived data, not persisted on the row).
 *
 * If a partido appears in our data but not here, downstream code treats it
 * as "unknown" rather than crashing — but we should keep this synced with
 * actual coverage.
 */

export interface PartidoZonaSurEntry {
  /** Display name — the canonical string stored in `properties.partido`. */
  name: string;
  /** ARBA municipal code (3 digits). First 3 chars of any `partida` tax ID. */
  arbaCode: string;
}

export const PARTIDOS_ZONA_SUR_ENTRIES: readonly PartidoZonaSurEntry[] = [
  { name: "Lomas de Zamora",    arbaCode: "063" },
  { name: "Avellaneda",         arbaCode: "003" },
  { name: "Lanús",              arbaCode: "060" },
  { name: "Quilmes",            arbaCode: "091" },
  { name: "Almirante Brown",    arbaCode: "002" },
  { name: "Esteban Echeverría", arbaCode: "028" },
  { name: "Ezeiza",             arbaCode: "035" },
] as const;

/**
 * String-array form, preserved as a separate export so existing consumers
 * (onboarding, edit forms, scoring zone matcher, landing stats) keep
 * working untouched.
 */
export const PARTIDOS_ZONA_SUR = PARTIDOS_ZONA_SUR_ENTRIES.map(
  (p) => p.name,
) as readonly string[];

export type PartidoZonaSur = (typeof PARTIDOS_ZONA_SUR_ENTRIES)[number]["name"];

export function isKnownPartido(s: string): s is PartidoZonaSur {
  return PARTIDOS_ZONA_SUR.includes(s);
}

/**
 * Returns the ARBA code for a partido name, or `null` if unknown.
 */
export function getArbaCodeForPartido(partido: string): string | null {
  const entry = PARTIDOS_ZONA_SUR_ENTRIES.find((p) => p.name === partido);
  return entry?.arbaCode ?? null;
}

/**
 * Returns the partido name for an ARBA code, or `null` if unknown.
 * Useful for reverse-mapping ARBA responses to our domain.
 */
export function getPartidoForArbaCode(arbaCode: string): string | null {
  const entry = PARTIDOS_ZONA_SUR_ENTRIES.find((p) => p.arbaCode === arbaCode);
  return entry?.name ?? null;
}

/**
 * Result of validating a partida against a partido — used by the loader
 * form to gate the "Traer datos de ARBA" button.
 */
export type PartidaValidation =
  | { ok: true; partido: string; arbaCode: string; normalized: string }
  | {
      ok: false;
      reason: "empty" | "format" | "unknown_partido" | "prefix_mismatch";
      message: string;
    };

/**
 * Validates a partida (9-digit string) against the selected partido.
 *
 *   1. The partida must be exactly 9 digits.
 *   2. The first 3 digits must match the partido's ARBA code.
 *
 * Accepts partidas with separators (spaces, dashes, dots) and normalizes
 * them — paper records often format as "063-056-604" or "063 056 604".
 */
export function validatePartida(
  partido: string,
  partida: string,
): PartidaValidation {
  const trimmed = partida.trim();
  if (trimmed.length === 0) {
    return { ok: false, reason: "empty", message: "Ingresá la partida." };
  }

  const normalized = trimmed.replace(/[\s\-.]/g, "");
  if (!/^\d{9}$/.test(normalized)) {
    return {
      ok: false,
      reason: "format",
      message: "La partida debe tener exactamente 9 dígitos.",
    };
  }

  const arbaCode = getArbaCodeForPartido(partido);
  if (arbaCode === null) {
    return {
      ok: false,
      reason: "unknown_partido",
      message: `El partido "${partido}" no está en nuestro mapa de Zona Sur.`,
    };
  }

  const prefix = normalized.slice(0, 3);
  if (prefix !== arbaCode) {
    const correctPartido = getPartidoForArbaCode(prefix);
    const hint = correctPartido
      ? ` Ese prefijo corresponde a ${correctPartido}.`
      : "";
    return {
      ok: false,
      reason: "prefix_mismatch",
      message: `La partida empieza con ${prefix}, pero ${partido} usa ${arbaCode}.${hint}`,
    };
  }

  return { ok: true, partido, arbaCode, normalized };
}
