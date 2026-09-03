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
 * Validates a partida against the selected partido and returns the 9-digit
 * key ARBA's WFS actually indexes on (its `pda` field).
 *
 * ARBA writes a partida as `PPP-NNNNNN-D`: a 3-digit partido code, the
 * 6-digit parcel number, and a check digit. The `pda` key is the first two
 * parts concatenated — the check digit is not part of it.
 *
 * People rarely type it that way. A tax bill for parcel 47850 in Lomas de
 * Zamora reads "063-47850-2", with the leading zero dropped. Stripping the
 * separators from that gives "063478502", which is nine digits and looks
 * valid, but silently pastes the check digit where a padding zero belongs
 * and asks ARBA about a parcel that does not exist. The lookup then comes
 * back empty and the UI blames the number instead of the parsing.
 *
 * So: when the input is grouped, treat the groups as PPP / NNNNNN / D and
 * pad the middle. Only fall back to plain concatenation when there are no
 * separators to learn from.
 */
/**
 * Turns however a person wrote a partida into the 9-digit key ARBA indexes,
 * or `null` when it can't be read as one.
 *
 * Accepted shapes:
 *   "063-47850-2"   grouped, check digit present, parcel not zero-padded
 *   "063-047850-2"  grouped, fully padded
 *   "063 47850"     grouped, no check digit
 *   "063047850"     the 9-digit key itself
 *   "0630478502"    10 digits — the key plus a trailing check digit
 */
export function normalizePartida(input: string): string | null {
  const raw = input.trim();
  if (raw.length === 0) return null;

  const groups = raw.split(/[\s\-.]+/).filter((g) => g.length > 0);
  if (groups.some((g) => !/^\d+$/.test(g))) return null;

  if (groups.length === 1) {
    const digits = groups[0];
    if (/^\d{9}$/.test(digits)) return digits;
    // 10 digits is the key with the check digit glued on the end.
    if (/^\d{10}$/.test(digits)) return digits.slice(0, 9);
    return null;
  }

  if (groups.length > 3) return null;

  // A trailing single digit is the check digit, which ARBA's `pda` key does
  // not carry. Group length is what separates the two formats people use:
  // "063-047850-2" ends in a check digit, "063-056-604" is just the 9-digit
  // key split into threes.
  const parts = groups[groups.length - 1].length === 1 ? groups.slice(0, -1) : groups;
  if (parts.length === 0) return null;

  const joined = parts.join("");
  if (/^\d{9}$/.test(joined)) return joined;

  // Shorter than 9 means the parcel number was written without its leading
  // zeros — "063 47850" for parcel 047850. Pad it back out.
  if (parts.length === 2 && parts[0].length === 3 && parts[1].length < 6) {
    return parts[0] + parts[1].padStart(6, "0");
  }

  return null;
}

export function validatePartida(
  partido: string,
  partida: string,
): PartidaValidation {
  const trimmed = partida.trim();
  if (trimmed.length === 0) {
    return { ok: false, reason: "empty", message: "Ingresá la partida." };
  }

  const normalized = normalizePartida(trimmed);
  if (normalized === null) {
    return {
      ok: false,
      reason: "format",
      message:
        "Formato inválido. Usá partido-partida-verificador (063-47850-2) o los 9 dígitos corridos (063047850).",
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

export type NomenclaturaValidation =
  | { ok: true; normalized: string }
  | {
      ok: false;
      reason: "empty" | "format" | "unknown_partido" | "prefix_mismatch";
      message: string;
    };

/**
 * Validates a cadastral nomenclature (ARBA's `cca`) the way validatePartida
 * validates a partida: shape first, then that its partido prefix agrees with
 * the partido the broker chose.
 *
 * Exists for units under propiedad horizontal, whose own partida is not in
 * ARBA's public layer — the lot's nomenclature is what the papers carry and
 * what the WFS answers to. Accepts the 42-character form as ARBA prints it,
 * with any spaces or dashes a person typed in between.
 */
export function validateNomenclatura(
  partido: string,
  nomenclatura: string,
): NomenclaturaValidation {
  const normalized = nomenclatura.replace(/[\s-]/g, "").toUpperCase();
  if (normalized.length === 0) {
    return { ok: false, reason: "empty", message: "Ingresá la nomenclatura catastral." };
  }
  if (!/^\d{3}[0-9A-Z]{39}$/.test(normalized)) {
    return {
      ok: false,
      reason: "format",
      message:
        "Formato inválido. La nomenclatura catastral son 42 caracteres tal como figura en ARBA (ej. 063020A00000000000000000000000680000005000).",
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
    const hint = correctPartido ? ` Ese prefijo corresponde a ${correctPartido}.` : "";
    return {
      ok: false,
      reason: "prefix_mismatch",
      message: `La nomenclatura empieza con ${prefix}, pero ${partido} usa ${arbaCode}.${hint}`,
    };
  }

  return { ok: true, normalized };
}
