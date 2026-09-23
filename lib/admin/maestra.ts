import ExcelJS from "exceljs";
import type { MaestraColumns, PartidaRow, UnidadRow } from "@/lib/admin/cartera-sync";
import { partidaFromCell } from "@/lib/admin/cartera-sync";

/**
 * Reads `PLANILLA MAESTRA - Inmobiliaria.xlsx` — the sheets `Unidades` and
 * `Partidas` — into the row shapes `cartera-sync.ts` works on.
 *
 * I/O only: no decisions live here. Column lookup is by header text,
 * accent- and case-insensitive, so a header retyped as "Direccion" still
 * resolves; a column that does not exist reads as `null` and is reported
 * through `MaestraColumns`, never silently defaulted (the `Publicar` column
 * is exactly the one that must not be assumed either way).
 */

export interface Maestra {
  unidades: UnidadRow[];
  partidas: PartidaRow[];
  columns: MaestraColumns;
  /** Header text of every column found in `Unidades`, for the report. */
  headers: string[];
}

function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** A cell's value as plain text, whatever ExcelJS wrapped it in. */
function cellText(v: ExcelJS.CellValue): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v.trim() === "" ? null : v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((r) => r.text).join("").trim() || null;
    if ("result" in v) return cellText(v.result as ExcelJS.CellValue);
    if ("text" in v) return String(v.text).trim() || null;
    if ("error" in v) return null;
  }
  return null;
}

function cellNumber(v: ExcelJS.CellValue): number | null {
  if (typeof v === "number") return v;
  const t = cellText(v);
  if (t === null) return null;
  const n = Number(t.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Header → column index (1-based) for a sheet whose first row is headers. */
function headerIndex(ws: ExcelJS.Worksheet): { index: Map<string, number>; headers: string[] } {
  const index = new Map<string, number>();
  const headers: string[] = [];
  ws.getRow(1).eachCell((cell, col) => {
    const h = cellText(cell.value);
    if (!h) return;
    headers.push(h);
    index.set(fold(h), col);
  });
  return { index, headers };
}

/** The maestra's exact header names, as PUBLICACION.md spells them. */
const UNIDADES_HEADERS = {
  direccion: "Dirección",
  unidad: "Unidad",
  tipo: "Tipo",
  cochera: "Cochera",
  tipoCochera: "Tipo cochera",
  etapa: "Etapa",
  situacion: "Situación",
  precioPretendido: "Precio pretendido (USD) — a la venta hoy",
  precioOferta: "Precio oferta (USD)",
  carpetaEnDisco: "Carpeta en disco",
  publicar: "Publicar",
  tituloWeb: "Título web",
  descripcionWeb: "Descripción web",
  m2Cubiertos: "m² cubiertos",
  m2Totales: "m² totales",
  ambientes: "Ambientes",
  dormitorios: "Dormitorios",
  banos: "Baños",
  anioConstruccion: "Año de construcción",
  etiquetas: "Etiquetas",
  operacion: "Operación",
  direccionReal: "Dirección real",
  localidad: "Localidad",
  linkAviso: "Link Zonaprop",
} as const;

export async function readMaestra(path: string): Promise<Maestra> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);

  const wsU = wb.getWorksheet("Unidades");
  if (!wsU) throw new Error('La maestra no tiene la hoja "Unidades".');
  const { index, headers } = headerIndex(wsU);

  // The "precio pretendido" header carries an em dash that gets retyped as a
  // hyphen easily; match on its stable prefix.
  const findCol = (header: string): number | null => {
    const exact = index.get(fold(header));
    if (exact) return exact;
    const prefix = fold(header).split(" (")[0];
    for (const [h, col] of index) if (h.startsWith(prefix)) return col;
    return null;
  };
  const cols: Record<keyof typeof UNIDADES_HEADERS, number | null> = Object.fromEntries(
    Object.entries(UNIDADES_HEADERS).map(([k, h]) => [k, findCol(h)]),
  ) as never;

  const text = (row: ExcelJS.Row, key: keyof typeof UNIDADES_HEADERS) =>
    cols[key] ? cellText(row.getCell(cols[key]!).value) : null;
  const num = (row: ExcelJS.Row, key: keyof typeof UNIDADES_HEADERS) =>
    cols[key] ? cellNumber(row.getCell(cols[key]!).value) : null;

  const unidades: UnidadRow[] = [];
  wsU.eachRow((row, n) => {
    if (n === 1) return;
    const direccion = text(row, "direccion");
    if (!direccion) return;
    // A dash in `Unidad` ("—", "-") means the row is the whole property, not
    // a unit of it. Kept as a dash it became "Talcahuano 258 —" on the site
    // and a folder called "-".
    const unidadRaw = text(row, "unidad");
    unidades.push({
      direccion,
      unidad: unidadRaw && /^[—–\-\s]+$/.test(unidadRaw) ? null : unidadRaw,
      tipo: text(row, "tipo"),
      cochera: text(row, "cochera"),
      tipoCochera: text(row, "tipoCochera"),
      etapa: text(row, "etapa"),
      situacion: text(row, "situacion"),
      precioPretendido: num(row, "precioPretendido"),
      precioOferta: num(row, "precioOferta"),
      carpetaEnDisco: text(row, "carpetaEnDisco"),
      publicar: text(row, "publicar"),
      linkAviso: text(row, "linkAviso"),
      tituloWeb: text(row, "tituloWeb"),
      descripcionWeb: text(row, "descripcionWeb"),
      m2Cubiertos: num(row, "m2Cubiertos"),
      m2Totales: num(row, "m2Totales"),
      ambientes: num(row, "ambientes"),
      dormitorios: num(row, "dormitorios"),
      banos: num(row, "banos"),
      anioConstruccion: num(row, "anioConstruccion"),
      etiquetas: text(row, "etiquetas"),
      operacion: text(row, "operacion"),
      direccionReal: text(row, "direccionReal"),
      localidad: text(row, "localidad"),
    });
  });

  // `Dirección real` and `Localidad` live on the `Propiedades` sheet (one row
  // per building), not on `Unidades`: the folder is "Vergara y Cabrera", the
  // street number and the town are facts of the building. Joined here so a
  // unit row can read them as if they were its own; a value typed on the unit
  // row still wins.
  let hasDireccionReal = cols.direccionReal !== null;
  let hasLocalidad = cols.localidad !== null;
  const wsProp = wb.getWorksheet("Propiedades");
  if (wsProp) {
    const { index: pIndex } = headerIndex(wsProp);
    const dirCol = pIndex.get(fold("Dirección"));
    const byBuilding = (header: string): Map<string, string> | null => {
      const col = pIndex.get(fold(header));
      if (!dirCol || !col) return null;
      const map = new Map<string, string>();
      wsProp.eachRow((row, n) => {
        if (n === 1) return;
        const dir = cellText(row.getCell(dirCol).value);
        const value = cellText(row.getCell(col).value);
        if (dir && value) map.set(fold(dir), value);
      });
      return map;
    };
    const reales = byBuilding("Dirección real");
    if (reales) {
      hasDireccionReal = true;
      for (const u of unidades) {
        if (!u.direccionReal) u.direccionReal = reales.get(fold(u.direccion)) ?? null;
      }
    }
    const localidades = byBuilding("Localidad");
    if (localidades) {
      hasLocalidad = true;
      for (const u of unidades) {
        if (!u.localidad) u.localidad = localidades.get(fold(u.direccion)) ?? null;
      }
    }
  }

  // `Partidas` is free-form: one merged title cell, then positional columns
  // [partida, código, partido, dirección, alcance, propiedad, notas].
  const partidas: PartidaRow[] = [];
  const wsP = wb.getWorksheet("Partidas");
  if (wsP) {
    wsP.eachRow((row, n) => {
      if (n === 1) return;
      const raw = cellText(row.getCell(1).value);
      if (!raw) return;
      const partida = partidaFromCell(raw);
      // Rows that are notes ("Qué falta …") have no partida and no partido.
      const partido = cellText(row.getCell(3).value);
      if (!partida && !partido) return;
      partidas.push({
        partida,
        partidaRaw: raw,
        partido,
        direccion: cellText(row.getCell(4).value),
        alcance: cellText(row.getCell(5).value),
        notas: cellText(row.getCell(7).value),
      });
    });
  }

  return {
    unidades,
    partidas,
    columns: {
      publicar: cols.publicar !== null,
      direccionReal: hasDireccionReal,
      operacion: cols.operacion !== null,
      localidad: hasLocalidad,
    },
    headers,
  };
}
