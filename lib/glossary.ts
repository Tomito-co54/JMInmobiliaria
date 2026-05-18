/**
 * Glossary of technical terms surfaced to buyers throughout the app.
 *
 * The principle: every piece of catastral / registral / notarial jargon a
 * buyer reads on this platform must have a plain-language explanation one
 * tap away. We keep them centralized here so the wording is consistent
 * across the property view, admin tools, and any future help pages.
 *
 * Add an entry when you find yourself writing a TermDefinition inline.
 */

export interface GlossaryTerm {
  /** Stable id, used as the lookup key. */
  id: string;
  /** The term as it shows in the UI (e.g. "Partida"). */
  label: string;
  /** Plain-Spanish definition shown inside the popover. */
  definition: string;
  /** Optional second paragraph with context for the curious. */
  context?: string;
  /** Optional external reference (e.g. ARBA's site). */
  link?: { url: string; label: string };
}

const TERMS: GlossaryTerm[] = [
  {
    id: "partida",
    label: "Partida",
    definition:
      "Identificador único de la propiedad en el sistema fiscal de ARBA (la agencia tributaria de la provincia de Buenos Aires).",
    context:
      "Si una propiedad no tiene partida visible, casi siempre es porque el aviso no la declaró — pero existe en ARBA. La cruzamos por coordenadas geográficas.",
  },
  {
    id: "nomenclatura_catastral",
    label: "Nomenclatura catastral",
    definition:
      "Código oficial que identifica la parcela en el catastro. Formato: Partido-Circunscripción-Sección-Manzana-Parcela.",
    context:
      "Es el ID con el que escribanos y agrimensores se refieren a la propiedad. La necesitás para sacar planos y certificados.",
  },
  {
    id: "superficie_arba",
    label: "Superficie ARBA",
    definition:
      "Metros cuadrados que ARBA tiene registrados oficialmente para esta parcela.",
    context:
      "Cuando difiere mucho de la superficie declarada en el aviso, puede ser que el publicante esté midiendo solo la unidad funcional (un departamento) y ARBA esté midiendo todo el terreno o el edificio.",
  },
  {
    id: "superficie_total",
    label: "Superficie total declarada",
    definition:
      "Metros cuadrados que el aviso original declara. No está verificado contra fuentes oficiales hasta que lo cruzamos con ARBA.",
  },
  {
    id: "informe_dominio",
    label: "Informe de dominio",
    definition:
      "Documento oficial del Registro de la Propiedad que muestra quién es el dueño, si tiene deudas, hipotecas o embargos sobre la propiedad.",
    context:
      "Es indispensable antes de firmar un boleto de compraventa. Vale ~$30k al Registro; se gestiona desde nuestra plataforma cuando esté ese servicio.",
  },
  {
    id: "partido",
    label: "Partido",
    definition:
      "División administrativa de la provincia de Buenos Aires. Ej: Lomas de Zamora, Avellaneda, Lanús.",
  },
  {
    id: "operation_venta",
    label: "Venta",
    definition: "Operación de compraventa — la propiedad se vende.",
  },
  {
    id: "operation_alquiler",
    label: "Alquiler",
    definition: "La propiedad se ofrece para alquilar, no para comprar.",
  },
  {
    id: "score_calidad",
    label: "Score de calidad",
    definition:
      "Nota objetiva del 0 al 100 que mide qué tan sólida es la propiedad en términos de datos verificables, no de gusto.",
    context:
      "Se compone de 5 sub-scores: documentación oficial, precio vs zona, calidad del aviso, tiempo en mercado, y coherencia entre lo declarado y ARBA.",
  },
  {
    id: "tiempo_en_mercado",
    label: "Tiempo en mercado",
    definition:
      "Días desde que nuestra plataforma vio el aviso por primera vez.",
    context:
      "Es un piso, no el dato real — la propiedad puede haber estado más tiempo en Zonaprop antes de que la encontráramos.",
  },
  {
    id: "match_intersects",
    label: "Match exacto con ARBA",
    definition:
      "Las coordenadas de la propiedad caen dentro del polígono de la parcela en ARBA — máxima confianza de que la parcela identificada es la correcta.",
    context:
      "Cuando el match es por proximidad (DWITHIN) en vez de intersección, la parcela está cerca pero no es 100% seguro que sea ésa.",
  },
];

const TERMS_BY_ID = Object.fromEntries(TERMS.map((t) => [t.id, t]));

export function getGlossaryTerm(id: string): GlossaryTerm | null {
  return TERMS_BY_ID[id] ?? null;
}

export function listGlossaryTerms(): GlossaryTerm[] {
  return TERMS.slice();
}
