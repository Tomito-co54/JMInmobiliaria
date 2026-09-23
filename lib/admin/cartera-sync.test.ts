import { describe, it, expect } from "vitest";
import {
  unitFolderCandidates,
  buildFicha,
  cocheraFromColumns,
  diffAgainstSite,
  findPartida,
  sameListingAddress,
  isStandaloneGarage,
  isThirdParty,
  parseEtiquetas,
  parseTipo,
  partidaFromCell,
  publishDecision,
  siteAddress,
  unitFolderName,
  unitSiteLabel,
  unpublishedStatus,
  type MaestraColumns,
  type PartidaRow,
  type UnidadRow,
} from "./cartera-sync";

const NO_NEW_COLUMNS: MaestraColumns = { publicar: false, direccionReal: false, operacion: false, localidad: false };
const ALL_COLUMNS: MaestraColumns = { publicar: true, direccionReal: true, operacion: true, localidad: true };

function row(over: Partial<UnidadRow> = {}): UnidadRow {
  return {
    direccion: "Belgrano 1287",
    unidad: "1°A",
    tipo: "2 ambientes con balcón (40 m²)",
    cochera: "opcional",
    tipoCochera: "Cubierta",
    etapa: "Activa",
    situacion: "A estrenar, a la venta",
    linkAviso: null,
    precioPretendido: 80000,
    precioOferta: null,
    carpetaEnDisco: "Propiedades/Familiar/Belgrano 1287",
    publicar: null,
    tituloWeb: null,
    descripcionWeb: null,
    m2Cubiertos: null,
    m2Totales: null,
    ambientes: null,
    dormitorios: null,
    banos: null,
    anioConstruccion: null,
    etiquetas: null,
    operacion: null,
    direccionReal: null,
    localidad: null,
    ...over,
  };
}

const MADRE: PartidaRow = {
  partida: "063047850",
  partidaRaw: "063-047850 (falta el dígito verificador)",
  partido: "Lomas de Zamora",
  direccion: "Belgrano 1287",
  alcance: "partida madre",
  notas: null,
};

describe("folder and site names (PUBLICACION.md rule 2)", () => {
  it("drops the degree sign for the folder and keeps it for the site", () => {
    expect(unitFolderName("1°C")).toBe("1C");
    expect(unitSiteLabel("1°C")).toBe("1°C");
  });

  it("normalizes the U.F / U.C spellings, typos included", () => {
    expect(unitFolderName("U.F: 9")).toBe("UF 9");
    expect(unitFolderName("U.F 2")).toBe("UF 2");
    expect(unitFolderName("U:F 1")).toBe("UF 1");
    expect(unitFolderName("U.F:1")).toBe("UF 1");
    expect(unitFolderName("U.C: A — espacio C")).toBe("UC A - espacio C");
    expect(unitFolderName("PB A")).toBe("PB A");
  });

  it("builds the site address the four Belgrano rows are already keyed by", () => {
    expect(siteAddress("Belgrano 1287", null, "1°A")).toBe("Belgrano 1287 1°A");
  });

  it("prefers the real street address over the folder name", () => {
    expect(siteAddress("Vergara y Cabrera", "Vergara 1901", "U.F: 9")).toBe("Vergara 1901 UF 9");
    expect(siteAddress("Alsina 455", null, null)).toBe("Alsina 455");
  });
});

describe("parseTipo", () => {
  it("reads a single surface as the whole unit", () => {
    const t = parseTipo("2 ambientes con balcón (40 m²)");
    expect(t.propertyType).toBe("departamento");
    expect(t.surfaceCovered).toBe(40);
    expect(t.surfaceTotal).toBe(40);
    expect(t.rooms).toBe(2);
    expect(t.extras).toEqual([]);
  });

  it("reads covered + expansion, and names the expansion as an extra", () => {
    const t = parseTipo("2 ambientes con terraza propia (40 m² + terraza 40 m²)");
    expect(t.surfaceCovered).toBe(40);
    expect(t.surfaceTotal).toBe(80);
    expect(t.extras).toEqual([{ kind: "terraza", detail: "40 m²" }]);
  });

  it("handles lofts, monoambientes and words for numbers", () => {
    expect(parseTipo("Loft dúplex con terraza (54 m² + terraza 30 m²)").propertyType).toBe("departamento");
    expect(parseTipo("Monoambiente con cochera").rooms).toBe(1);
    expect(parseTipo("Dos ambientes").rooms).toBe(2);
    expect(parseTipo("3 ambientes con patio (55 m² + patio 22 m²)").extras).toEqual([{ kind: "patio", detail: "22 m²" }]);
  });

  it("tells a garage sold alone from a flat with one", () => {
    expect(parseTipo("1/4 cochera cubierta").propertyType).toBe("cochera");
    expect(parseTipo("Monoambiente con cochera").propertyType).toBe("departamento");
    expect(parseTipo("Casa").propertyType).toBe("casa");
    expect(parseTipo("Local").propertyType).toBe("local");
    expect(parseTipo("Terrenos baldíos").propertyType).toBe("lote");
  });

  it("returns nulls, never guesses, for text it cannot read", () => {
    const t = parseTipo("3 cocheras cubiertas + 1 baulera");
    expect(t.propertyType).toBe("cochera");
    expect(t.surfaceCovered).toBeNull();
    expect(t.rooms).toBeNull();
    expect(parseTipo(null).propertyType).toBeNull();
  });
});

describe("cocheraFromColumns", () => {
  it("maps 'opcional' + tipo to an optional extra with the type as detail", () => {
    expect(cocheraFromColumns("opcional", "Cubierta")).toEqual({ kind: "cochera", mode: "opcional", detail: "cubierta", priceDelta: null });
  });

  it("maps a described garage to an included one", () => {
    expect(cocheraFromColumns("Cochera doble cubierta", "Integrada")).toEqual({
      kind: "cochera",
      mode: "incluida",
      detail: "Cochera doble cubierta",
      priceDelta: null,
    });
  });

  it("reads the agreed shapes: optional with surcharge, included with detail", () => {
    expect(cocheraFromColumns("Opcional (+USD 5.000)", null)).toEqual({ kind: "cochera", mode: "opcional", detail: null, priceDelta: 5000 });
    expect(cocheraFromColumns("Incluida: ½ U.C B espacio C", "Cubierta")).toEqual({
      kind: "cochera",
      mode: "incluida",
      detail: "½ U.C B espacio C, cubierta",
      priceDelta: null,
    });
    // An included garage never carries a surcharge, whatever the text says.
    expect(cocheraFromColumns("Incluida (+USD 5.000)", null)?.priceDelta).toBeNull();
  });

  it("is null when there is none", () => {
    expect(cocheraFromColumns(null, null)).toBeNull();
    expect(cocheraFromColumns("no", "Cubierta")).toBeNull();
  });
});

describe("publishDecision — fails closed", () => {
  it("is UNKNOWN, not no and not yes, while the Publicar column is missing", () => {
    expect(publishDecision(row(), NO_NEW_COLUMNS).kind).toBe("desconocido");
  });

  it("publishes Sí, and only a written No says no", () => {
    expect(publishDecision(row({ publicar: "Sí" }), ALL_COLUMNS)).toEqual({ kind: "publicar" });
    expect(publishDecision(row({ publicar: "No" }), ALL_COLUMNS).kind).toBe("no");
    expect(publishDecision(row({ publicar: null }), ALL_COLUMNS).kind).toBe("desconocido");
    expect(publishDecision(row({ publicar: "" }), ALL_COLUMNS).kind).toBe("desconocido");
  });

  it("lets Publicar = Sí win over a non-Activa Etapa, and says so", () => {
    const d = publishDecision(row({ publicar: "Sí", etapa: "En transición" }), ALL_COLUMNS);
    expect(d.kind).toBe("publicar");
    expect(d.kind === "publicar" && d.note).toContain("En transición");
    // Unmarked non-Activa rows (sold, historic) are still a no.
    expect(publishDecision(row({ publicar: null, etapa: "Histórico" }), ALL_COLUMNS).kind).toBe("no");
  });

  it("recognises standalone garages and third-party folders", () => {
    expect(isStandaloneGarage(row({ tipo: "3 cocheras cubiertas + 1 baulera" }))).toBe(true);
    expect(isStandaloneGarage(row({ tipo: "Cochera cubierta (PB)" }))).toBe(true);
    expect(isStandaloneGarage(row({ tipo: "Monoambiente" }))).toBe(false);
    expect(isThirdParty(row({ carpetaEnDisco: "Propiedades/Terceros/Belgrano 1287" }))).toBe(true);
    expect(isThirdParty(row({ carpetaEnDisco: "Propiedades\\Terceros\\X" }))).toBe(true);
    expect(isThirdParty(row({ carpetaEnDisco: "Propiedades/Familiar/Belgrano 1287" }))).toBe(false);
  });

  it("sends sold units to 'vendida' and the rest to 'borrador'", () => {
    expect(unpublishedStatus(row({ etapa: "En transición", situacion: "Vendida, cobrada; a escriturar" }))).toBe("vendida");
    expect(unpublishedStatus(row({ etapa: "Histórico", situacion: "ESCRITURADO" }))).toBe("vendida");
    expect(unpublishedStatus(row({ situacion: "propio del fideicomiso" }))).toBe("borrador");
  });
});

describe("partidas", () => {
  it("reads the sheet's annotated cell", () => {
    expect(partidaFromCell("063-047850 (falta el dígito verificador)")).toBe("063047850");
    expect(partidaFromCell("Qué falta")).toBeNull();
  });

  it("prefers the unit's own row and falls back to the mother partida", () => {
    const own: PartidaRow = { ...MADRE, partida: "063241060", partidaRaw: "063-241060", direccion: "Vergara y Cabrera", alcance: "U.F: 9" };
    const madre: PartidaRow = { ...MADRE, direccion: "Vergara y Cabrera" };
    expect(findPartida([madre, own], "Vergara y Cabrera", "UF 9")).toEqual({ row: own, via: "unidad" });
    expect(findPartida([madre, own], "Vergara y Cabrera", "U.F: 3")).toEqual({ row: madre, via: "madre" });
    expect(findPartida([MADRE], "Cabrera 205", "U.F 2")).toBeNull();
  });
});

describe("sameListingAddress", () => {
  it("ignores a trailing locality, case and accents", () => {
    expect(sameListingAddress("Talcahuano 258", "Talcahuano 258, Banfield")).toBe(true);
    expect(sameListingAddress("Lanús 10", "lanus 10")).toBe(true);
  });
  it("still tells units and numbers apart", () => {
    expect(sameListingAddress("Belgrano 1287 1°A", "Belgrano 1287 1°B")).toBe(false);
    expect(sameListingAddress("Talcahuano 258", "Talcahuano 2580")).toBe(false);
    expect(sameListingAddress("", ", Banfield")).toBe(false);
  });
});

describe("parseEtiquetas", () => {
  it("accepts labels and keys, refuses the rest", () => {
    expect(parseEtiquetas("Oferta, a estrenar")).toEqual({ tags: ["oferta", "a_estrenar"], unknown: [] });
    expect(parseEtiquetas("apto_comercial")).toEqual({ tags: ["apto_comercial"], unknown: [] });
    expect(parseEtiquetas("Remate")).toEqual({ tags: [], unknown: ["Remate"] });
    expect(parseEtiquetas(null)).toEqual({ tags: [], unknown: [] });
  });
});

describe("buildFicha", () => {
  const photos = ["C:/x/Publicación/1A/fotos/01-1A.jpg", "C:/x/Publicación/1A/fotos/02-1A.jpg"];

  it("assembles the loader JSON for a Belgrano unit and records every origin", () => {
    const b = buildFicha({
      row: row(),
      columns: NO_NEW_COLUMNS,
      partida: { row: MADRE, via: "madre" },
      provisorio: { description: "Dos ambientes a estrenar.", year_built: 2026, bedrooms: 1, bathrooms: 1, extras: [{ kind: "cochera", price_delta: 8000 }] },
      photos,
    });
    expect(b.errors).toEqual([]);
    expect(b.ficha).toMatchObject({
      address: "Belgrano 1287 1°A",
      partido: "Lomas de Zamora",
      partida: "063047850",
      property_type: "departamento",
      operation_type: "venta",
      price_amount: 80000,
      price_currency: "USD",
      surface_covered: 40,
      surface_total: 40,
      rooms: 2,
      bedrooms: 1,
      bathrooms: 1,
      year_built: 2026,
      description: "Dos ambientes a estrenar.",
      extras: [{ kind: "cochera", mode: "opcional", detail: "cubierta", price_delta: 8000 }],
      photos,
    });
    expect(b.origen).toMatchObject({
      price_amount: "maestra",
      partida: "partidas",
      partido: "partidas",
      surface_covered: "derivado",
      description: "provisorio",
      extras: "provisorio",
      operation_type: "default",
      photos: "fotos",
    });
    expect(b.warnings).toContain("partida: es la partida madre del edificio, la unidad no tiene la suya en la hoja Partidas.");
  });

  it("publishes the offer price, keeps the list price out, and tags it", () => {
    const b = buildFicha({
      row: row({ precioPretendido: 80000, precioOferta: 69900 }),
      columns: NO_NEW_COLUMNS,
      partida: { row: MADRE, via: "madre" },
      provisorio: null,
      photos,
    });
    expect(b.ficha.price_amount).toBe(69900);
    expect(b.ficha.tags).toEqual(["oferta"]);
    expect(b.origen.price_amount).toBe("maestra");
    expect(b.origen.tags).toBe("maestra");
  });

  it("does not duplicate the oferta tag when it is already there", () => {
    const b = buildFicha({
      row: row({ precioOferta: 69900, etiquetas: "Oferta, A estrenar" }),
      columns: NO_NEW_COLUMNS,
      partida: { row: MADRE, via: "madre" },
      provisorio: null,
      photos,
    });
    expect(b.ficha.tags).toEqual(["oferta", "a_estrenar"]);
  });

  it("lets the maestra win over provisorio and says so", () => {
    const b = buildFicha({
      row: row({ descripcionWeb: "De la maestra." }),
      columns: NO_NEW_COLUMNS,
      partida: { row: MADRE, via: "madre" },
      provisorio: { description: "Del archivo." },
      photos,
    });
    expect(b.ficha.description).toBe("De la maestra.");
    expect(b.origen.description).toBe("maestra");
    expect(b.warnings).toContain("description: la maestra ya lo trae, se ignora provisorio.json.");
  });

  it("refuses an unknown provisorio key instead of dropping it", () => {
    const b = buildFicha({
      row: row(),
      columns: NO_NEW_COLUMNS,
      partida: { row: MADRE, via: "madre" },
      provisorio: { precio: 70000 },
      photos,
    });
    expect(b.errors).toContain('provisorio.json: campo desconocido "precio".');
  });

  it("does not invent a type it cannot read from Tipo", () => {
    const b = buildFicha({
      row: row({ tipo: "1 baulera", unidad: "Baulera", cochera: null }),
      columns: NO_NEW_COLUMNS,
      partida: { row: MADRE, via: "madre" },
      provisorio: null,
      photos: [],
    });
    expect(b.errors.some((e) => e.startsWith("property_type"))).toBe(true);
    expect(b.warnings).toContain("Sin fotos en Publicación/<Unidad>/fotos/: la ficha no se va a poder publicar.");
  });

  it("merges the terrace from Tipo with the garage from the Cochera column", () => {
    const b = buildFicha({
      row: row({ unidad: "2°A", tipo: "2 ambientes con terraza propia (40 m² + terraza 40 m²)" }),
      columns: NO_NEW_COLUMNS,
      partida: { row: MADRE, via: "madre" },
      provisorio: { extras: [{ kind: "cochera", price_delta: 9000 }, { kind: "terraza", detail: "propia, 40 m²" }] },
      photos,
    });
    expect(b.ficha.extras).toEqual([
      { kind: "cochera", mode: "opcional", detail: "cubierta", price_delta: 9000 },
      { kind: "terraza", mode: "incluida", detail: "propia, 40 m²", price_delta: null },
    ]);
    expect(b.ficha.surface_total).toBe(80);
  });
});

describe("diffAgainstSite", () => {
  it("only reports fields the ficha sets, and compares numbers as numbers", () => {
    const site = { price_amount: "69900", surface_total: "40", tags: ["oferta"], extras: [{ kind: "cochera", mode: "opcional", detail: null, price_delta: 8000 }], partida: "063047850" };
    const diffs = diffAgainstSite(
      { price_amount: 80000, surface_total: 40, partida: "063-047850", extras: [{ kind: "cochera", mode: "opcional", detail: null, price_delta: 8000 }] },
      site,
    );
    expect(diffs).toEqual([{ field: "price_amount", site: "69900", ficha: 80000 }]);
  });

  it("sees a tag set and an extras list as the same regardless of order", () => {
    expect(
      diffAgainstSite(
        { tags: ["a_estrenar", "oferta"], extras: [{ kind: "terraza", mode: "incluida", detail: "x", price_delta: null }, { kind: "cochera", mode: "opcional", detail: null, price_delta: 1 }] },
        { tags: ["oferta", "a_estrenar"], extras: [{ kind: "cochera", mode: "opcional", detail: null, price_delta: 1 }, { kind: "terraza", mode: "incluida", detail: "x", price_delta: null }] },
      ),
    ).toEqual([]);
  });
});

describe("unitFolderCandidates", () => {
  it("accepts the UF spelling for a unit the maestra writes as a bare number", () => {
    // Pellegrini y Portela: `8` in the maestra, `UF 8` on disk.
    expect(unitFolderCandidates("8")).toEqual(["8", "UF 8"]);
    expect(unitFolderCandidates("U.F: 8")).toEqual(["UF 8", "8"]);
  });

  it("leaves a floor unit alone", () => {
    expect(unitFolderCandidates("1°C")).toEqual(["1C"]);
  });
});

describe("siteAddress with a locality in `Dirección real`", () => {
  it("keeps the unit next to the street number and spells a bare number as UF", () => {
    expect(siteAddress("Pellegrini y Portela", "Portela 95, Lomas de Zamora", "8")).toBe(
      "Portela 95 UF 8, Lomas de Zamora",
    );
  });

  it("does not change an address without a locality", () => {
    expect(siteAddress("Vergara y Cabrera", "Vergara 1901", "U.F: 9")).toBe("Vergara 1901 UF 9");
    expect(siteAddress("Belgrano 1287", null, "1°C")).toBe("Belgrano 1287 1°C");
  });
});

describe("buildFicha con precio de oferta", () => {
  const build = (over: Partial<UnidadRow>) =>
    buildFicha({ row: row(over), columns: ALL_COLUMNS, provisorio: null, photos: [], partida: null }).ficha as Record<
      string,
      unknown
    >;

  it("publica la oferta y guarda el precio de lista al lado", () => {
    const f = build({ precioPretendido: 80000, precioOferta: 69900 });
    expect(f.price_amount).toBe(69900);
    expect(f.price_list_amount).toBe(80000);
    expect(f.tags).toContain("oferta");
  });

  it("no manda precio de lista cuando no hay oferta", () => {
    const f = build({ precioPretendido: 80000, precioOferta: null });
    expect(f.price_amount).toBe(80000);
    expect(f.price_list_amount).toBeUndefined();
  });

  it("descarta un precio de lista que no está por encima de la oferta", () => {
    // Un tachado por debajo del precio vigente leería la oferta como aumento.
    const f = build({ precioPretendido: 69900, precioOferta: 69900 });
    expect(f.price_list_amount).toBeUndefined();
  });
});

describe("cocheraFromColumns cuando la celda no habla de una cochera", () => {
  it("lee 'terraza 05-01' como terraza, no como cochera", () => {
    // Alsina 3°O: la columna Cochera terminó guardando lo que viene con la
    // unidad, y publicar "cochera incluida (terraza 05-01)" sería afirmar algo
    // que los papeles no dicen.
    expect(cocheraFromColumns("terraza 05-01", null)).toEqual({
      kind: "terraza",
      mode: "incluida",
      detail: "05-01",
      priceDelta: null,
    });
  });

  it("la cochera gana si la celda la nombra junto a otra cosa", () => {
    expect(cocheraFromColumns("00-15 + terraza 05-02", null)?.kind).toBe("cochera");
    expect(cocheraFromColumns("Opcional (+USD 5.000)", "Cubierta")?.kind).toBe("cochera");
  });

  it("una celda sin palabra conocida sigue siendo la cochera", () => {
    expect(cocheraFromColumns("00-06", null)).toEqual({
      kind: "cochera",
      mode: "incluida",
      detail: "00-06",
      priceDelta: null,
    });
  });
});

describe("buildFicha: localidad", () => {
  const photos = ["C:/x/Publicación/1A/fotos/01-1A.jpg"];
  const build = (localidad: string | null, columns = ALL_COLUMNS) =>
    buildFicha({ row: row({ localidad }), columns, partida: { row: MADRE, via: "madre" }, provisorio: null, photos });

  it("writes the canonical spelling from the maestra", () => {
    const b = build("banfield");
    expect(b.errors).toEqual([]);
    expect(b.ficha.localidad).toBe("Banfield");
    expect(b.origen.localidad).toBe("maestra");
  });

  it("refuses a localidad that is not in the unit's partido", () => {
    const b = build("Lanús Oeste");
    expect(b.errors.some((e) => e.startsWith("localidad:"))).toBe(true);
  });

  it("only warns when the column exists and the cell is empty", () => {
    expect(build(null).warnings.some((w) => w.startsWith("localidad:"))).toBe(true);
    expect(build(null, NO_NEW_COLUMNS).warnings.some((w) => w.startsWith("localidad:"))).toBe(false);
    expect(build(null).ficha.localidad).toBeUndefined();
  });
});
