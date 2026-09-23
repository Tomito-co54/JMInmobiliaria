/**
 * Buying-process content for /guia-de-compra.
 *
 * Plain data — no React, no DB. Easy to copy-edit without touching
 * components. The owner reviews this file and adjusts copy as needed.
 *
 * Cost figures and timing are realistic ranges as of 2026 AR; they are
 * intentionally approximate so users get an order of magnitude without
 * us being responsible for exact tariffs that change frequently.
 */

export type DocumentSlug =
  | "reserva"
  | "informe_dominio"
  | "informe_inhibiciones"
  | "estado_parcelario"
  | "libre_deuda_municipal"
  | "libre_deuda_provincial"
  | "libre_deuda_expensas"
  | "boleto_compraventa"
  | "escritura";

export interface DocumentInfo {
  slug: DocumentSlug;
  title: string;
  shortDescription: string;
  what: string;
  why: string;
  issuedBy: string;
  /** Overrides "Quién lo emite" when the question is a different one. */
  issuedByLabel?: string;
  cost?: string;
  timeframe?: string;
  /** Broker fees paid at this document, stated plainly without figures. */
  fees?: string;
  notes?: string;
}

export interface ProcessStep {
  number: number;
  slug: string;
  title: string;
  subtitle: string;
  what: string;
  /**
   * How the stage unfolds, stated impersonally.
   *
   * This used to be `weHandle` ("de esto nos encargamos nosotros"), and before
   * that a single `actions` list from the upstream buyer portal that told the
   * reader to go fetch every report. Both voices were wrong for this site: the
   * guide informs a process, it does not sell a service or walk anyone through
   * it. The personal part — costs in detail, negotiation — happens in person.
   */
  process: string[];
  /** Points the buyer weighs at this stage, kept abstract on purpose. */
  considerations: string[];
  documentSlugs: DocumentSlug[];
  /** The list shows the main documents only, and the heading says so. */
  mainDocumentsOnly?: boolean;
  /**
   * A document shown open inside the stage instead of as a card, for a stage
   * that is essentially that one document. `what` then carries its "qué es".
   */
  inlineDocument?: DocumentSlug;
  warnings?: string[];
}

// ---------------------------------------------------------------------------
// Documents — the building blocks of the process. Multiple steps can
// reference the same document.
// ---------------------------------------------------------------------------

export const DOCUMENTS: Record<DocumentSlug, DocumentInfo> = {
  reserva: {
    slug: "reserva",
    title: "Reserva ad referéndum",
    shortDescription:
      "Oferta de compra que aparta la propiedad por un plazo acordado mientras se revisa la documentación.",
    what:
      "Es una oferta de compra acompañada de un anticipo que la inmobiliaria retiene en garantía. Mientras se piden informes y revisa la documentación, el vendedor no puede venderle a otra persona.",
    why:
      "Te da tiempo para verificar la propiedad sin perderla. Si te arrepentís, perdés la reserva. Si el vendedor la acepta, inicia la operación. Si luego se retracta, te devuelve el doble.",
    issuedBy: "Inmobiliaria; es entre partes.",
    cost:
      "Sin costo de emisión. El monto que ponés (5% típicamente) se computa después contra el precio final.",
    timeframe: "Se firma el mismo día que querés reservar.",
  },

  informe_dominio: {
    slug: "informe_dominio",
    title: "Informe de Dominio",
    shortDescription:
      "El documento más importante de todos: te dice quién es el dueño real y si la propiedad tiene problemas legales.",
    what:
      "Emitido por el Registro de la Propiedad Inmueble (RPI) de la provincia. Resume el historial registral: titular actual, transferencias anteriores, y gravámenes vigentes — embargos, hipotecas, usufructos, restricciones, prohibiciones de innovar, etc.",
    why:
      "Sin esto, no sabés si quien te está vendiendo es realmente el dueño, ni si la propiedad arrastra deudas o restricciones. Es el cero absoluto del due diligence.",
    issuedBy:
      "Registro de la Propiedad Inmueble de la provincia (en PBA: La Plata).",
  },

  informe_inhibiciones: {
    slug: "informe_inhibiciones",
    title: "Informe de Inhibiciones",
    shortDescription:
      "Verifica que el vendedor (la persona) tenga capacidad legal para vender sus bienes.",
    what:
      "Emitido también por el RPI, pero sobre la persona del vendedor — no sobre el inmueble. Te dice si esa persona tiene alguna inhibición judicial que le impida disponer de sus bienes (por ejemplo, por un juicio en curso).",
    why:
      "Una persona inhibida no puede vender. Si firmás un boleto con alguien inhibido, después no podés escriturar. El informe te lo confirma antes del boleto.",
    issuedBy: "Registro de la Propiedad Inmueble.",
  },

  estado_parcelario: {
    slug: "estado_parcelario",
    title: "Estado Parcelario",
    shortDescription:
      "Un agrimensor matriculado certifica que el plano coincide con la realidad física.",
    what:
      "Relevamiento topográfico de la parcela firmado por agrimensor. Confirma que las dimensiones y la posición del inmueble en la realidad coinciden con el plano registrado.",
    why:
      "Verifica estado y corrobora límites de parcela, el escribano no puede escriturar sin un estado parcelario vigente. Es el documento que más demora si está vencido.",
    issuedBy: "Agrimensor matriculado.",
  },

  libre_deuda_municipal: {
    slug: "libre_deuda_municipal",
    title: "Libre Deuda Municipal",
    shortDescription:
      "Confirma que no hay deudas de tasas municipales (ABL, alumbrado, barrido, limpieza).",
    what:
      "Constancia emitida por la municipalidad donde está el inmueble. Lista las deudas vigentes de tasas municipales y los compromisos de pago activos.",
    why:
      "Las deudas municipales siguen al inmueble, no al titular anterior. Si comprás con deudas, las heredás — o tenés que negociar que el vendedor las cancele antes de la escritura.",
    issuedBy: "Municipalidad del partido donde está la propiedad.",
    cost: "Suele ser gratuito; algunas municipalidades cobran una tasa simbólica.",
    timeframe: "2-7 días hábiles.",
  },

  libre_deuda_provincial: {
    slug: "libre_deuda_provincial",
    title: "Libre Deuda Provincial (Impuesto Inmobiliario)",
    shortDescription:
      "Confirma que el impuesto inmobiliario provincial está al día.",
    what:
      "Constancia emitida por ARBA. Lista las deudas pendientes de Impuesto Inmobiliario sobre la partida.",
    why:
      "Misma lógica que la municipal: las deudas siguen al inmueble. Hay que pedirla antes del boleto para negociar quién las paga.",
    issuedBy: "ARBA (Provincia de Buenos Aires).",
    cost: "Gratuito vía web autogestión con CIT/Clave Fiscal.",
    timeframe: "Inmediato online.",
  },

  libre_deuda_expensas: {
    slug: "libre_deuda_expensas",
    title: "Libre Deuda de Expensas (PH/Departamento)",
    shortDescription:
      "Para PH o departamentos: confirma que las expensas están al día.",
    what:
      "Certificado firmado por el administrador del consorcio. Detalla las expensas vencidas y los acuerdos de pago.",
    why:
      "Las expensas también siguen al inmueble. Comprar un departamento con expensas atrasadas significa empezar tu vida ahí con una deuda heredada.",
    issuedBy: "Administrador del consorcio.",
    cost: "$5.000 - $15.000 ARS según administración.",
    timeframe: "1-5 días hábiles.",
    notes:
      "Solo aplica si la propiedad es PH, departamento o cualquier régimen de propiedad horizontal.",
  },

  boleto_compraventa: {
    slug: "boleto_compraventa",
    title: "Boleto de Compraventa",
    shortDescription:
      "El contrato privado que obliga a las partes a escriturar. Es vinculante.",
    what:
      "Contrato firmado entre comprador y vendedor donde se establecen el precio, las condiciones, los plazos para escriturar, y las penalidades por incumplimiento. No transfiere propiedad — eso lo hace recién la escritura — pero genera obligaciones recíprocas.",
    why:
      "Cuando firmás boleto y entregás el primer pago fuerte (suele ser 30% del precio), las dos partes quedan comprometidas legalmente. Es el momento donde la operación se vuelve seria.",
    issuedByLabel: "¿Quién lo redacta?",
    issuedBy: "Ese es nuestro trabajo, y consta de envíos previos para confirmación.",
    timeframe: "Se firma cuando todos los informes están OK, típicamente 2-4 semanas después de la reserva.",
    fees: "Es el momento en que se abonan los honorarios del martillero.",
    notes:
      "Cláusulas a mirar con lupa: plazo para escriturar, lugar de la escritura, qué pasa si no se consigue crédito, gastos de cada parte, fecha de entrega de posesión.",
  },

  escritura: {
    slug: "escritura",
    title: "Escritura Traslativa de Dominio",
    shortDescription:
      "El instrumento público que efectivamente transfiere la propiedad. Lo firma el escribano.",
    what:
      "Documento solemne redactado y firmado por un escribano público. Es lo que transfiere la propiedad del vendedor al comprador. Antes de esto, sos dueño contractual; recién con la escritura sos dueño legalmente.",
    why:
      "Hasta que no escriturás, no figurás como titular en el Registro de la Propiedad — y eso es lo que prueba que sos dueño ante terceros (bancos, embargantes, herederos).",
    issuedBy: "Escribano público matriculado.",
    cost:
      "Honorarios del escribano: 1.5% - 3% del precio. Impuesto de sellos: 1.2% - 2.5% (suele dividirse 50/50). Otros gastos (testimonios, certificados, gastos de inscripción): 0.5% - 1%. Total para el comprador: típicamente 3-5% del precio.",
    timeframe:
      "El día de la firma se hace todo: se entrega el saldo del precio, se firma la escritura, se entregan llaves. La inscripción en el RPI la hace el escribano y demora 30-60 días después.",
    notes:
      "En CABA el comprador suele elegir escribano; en PBA, vendedor (negociable). Pedí presupuesto a 2-3 escribanos — los honorarios son negociables.",
  },
};

// ---------------------------------------------------------------------------
// Process steps — the timeline. Each step references documents by slug.
// ---------------------------------------------------------------------------

export const PROCESS_STEPS: ProcessStep[] = [
  {
    number: 1,
    slug: "pre-busqueda",
    title: "Pre-búsqueda",
    subtitle: "Antes de la primera visita",
    what:
      "Toda compra empieza por una idea de cómo se quiere vivir: el barrio, el espacio, el momento. Darle forma a esa idea es lo que convierte una búsqueda en una decisión.",
    process: [
      "El costo de una compra no es el precio publicado: a él se suman la escritura, los honorarios y el impuesto de sellos.",
      "Distinguir lo indispensable de lo deseable define el alcance de la búsqueda.",
    ],
    considerations: [
      "La forma de pago —contado, crédito hipotecario o financiación directa— ordena los plazos de toda la operación.",
    ],
    documentSlugs: [],
  },
  {
    number: 2,
    slug: "busqueda",
    title: "Búsqueda y visitas",
    subtitle: "Conocer el lugar",
    what:
      "Las fotos muestran una propiedad; la visita la pone en contexto. El entorno, los accesos, su estado real: lo que decide una compra —para vivir, invertir o trabajar— rara vez entra en una publicación.",
    process: [
      "Indicar qué se busca permite ordenar el catálogo según lo que mejor se ajusta.",
      "Las visitas se coordinan en el horario que convenga.",
    ],
    considerations: [
      "Las dudas que aparecen en la visita son las que conviene resolver antes de avanzar.",
    ],
    documentSlugs: [],
  },
  {
    number: 3,
    slug: "reserva",
    title: "Reserva",
    subtitle: "El primer compromiso",
    what:
      "La reserva aparta la propiedad por un plazo acordado, a modo de oferta: mientras dura, la propiedad deja de ofrecerse a otros interesados. Si la compra se confirma, se entrega una seña a cuenta del precio.",
    process: [
      "Se acuerdan el precio y las condiciones de pago.",
      "Se firma la reserva, con un plazo suficiente para reunir la documentación.",
      "La seña se computa después como parte del precio.",
    ],
    considerations: [
      "Es el primer paso que compromete dinero: conviene llegar a él con la decisión tomada.",
    ],
    documentSlugs: ["reserva"],
    warnings: [
      "Reserva y seña no son lo mismo. Si quien reserva desiste, pierde la reserva; la seña, en cambio, compromete a concretar la compra.",
    ],
  },
  {
    number: 4,
    slug: "due-diligence",
    title: "Due diligence",
    subtitle: "Los informes antes del boleto",
    what:
      "Antes del boleto se reúnen los informes que confirman la situación de la propiedad —Informe de dominio— y de quien la vende —Informe de inhibiciones—, para confirmar la titularidad, gravámenes, deudas y datos catastrales. Es la etapa más técnica del proceso, y la que le da certeza y orden a todo lo que sigue.",
    process: [
      "Informes de dominio y de inhibiciones, emitidos por el Registro de la Propiedad.",
      "Datos catastrales: partida, nomenclatura y superficie de la parcela.",
      "Libres deuda municipal, provincial y, en propiedad horizontal, de expensas.",
      "Estado parcelario, cuando la antigüedad del plano lo requiere.",
    ],
    considerations: [
      "Una revisión técnica del inmueble, si se desea, puede sumarse en esta etapa.",
    ],
    documentSlugs: [
      "informe_dominio",
      "informe_inhibiciones",
      "estado_parcelario",
    ],
    mainDocumentsOnly: true,
    warnings: [
      "Las deudas registradas siguen al inmueble, no a su titular anterior. Su cancelación se acuerda antes del boleto.",
    ],
  },
  {
    number: 5,
    // The slug predates the split into boleto (5) and escritura (6). It stays
    // because search_profiles.current_stage has a CHECK on these values
    // (migration 00010) and the legacy advisor reads it; renaming it is a
    // migration for a card only the admin ever sees.
    slug: "boleto-y-escritura",
    title: "Boleto de compraventa",
    subtitle: "El compromiso",
    what:
      "Contrato firmado entre comprador y vendedor donde se establecen el precio, las condiciones, los plazos para escriturar, y las penalidades por incumplimiento. No transfiere propiedad — eso lo hace recién la escritura — pero genera obligaciones recíprocas. Desde su firma, el escribano suele necesitar un mínimo de 20 a 30 días para preparar la escritura.",
    process: [
      "Se fijan por escrito el precio, la forma de pago y la fecha de escritura.",
      "Facilitamos la elección del escribano.",
      "La documentación pasa al escribano, que redacta la escritura.",
    ],
    considerations: [],
    documentSlugs: [],
    inlineDocument: "boleto_compraventa",
  },
  {
    number: 6,
    slug: "escritura",
    title: "Escritura",
    subtitle: "La firma",
    what:
      "Documento solemne redactado y firmado por un escribano público. Es lo que transfiere la propiedad del vendedor al comprador. Antes de esto, sos dueño contractual; recién con la escritura sos dueño legalmente.",
    process: [
      "Antes de firmar se confirma que los informes sigan vigentes.",
      "En la escritura se entregan el saldo del precio y la posesión.",
    ],
    considerations: [
      "El saldo del precio tiene que estar disponible el día de la escritura.",
    ],
    documentSlugs: [],
    inlineDocument: "escritura",
    warnings: [
      "No se entrega dinero sin instrumento firmado, ni se firma sin que el dinero esté disponible.",
    ],
  },
  {
    number: 7,
    slug: "post-escritura",
    title: "Post-escritura",
    subtitle: "Después de la firma",
    what:
      "Con la escritura firmada, la propiedad ya es del comprador. Quedan la inscripción en el Registro y el cambio de titularidad de impuestos y servicios.",
    process: [
      "El escribano inscribe la escritura en el Registro de la Propiedad y entrega el testimonio una vez inscripto.",
      "En propiedad horizontal, el cambio de titular se notifica al consorcio.",
    ],
    considerations: [
      "Los servicios —luz, gas, agua— pasan a nombre del nuevo titular.",
      "La mudanza.",
    ],
    documentSlugs: [],
  },
];

// ---------------------------------------------------------------------------
// Glossary — flat list of terms cross-referenced from the process.
// ---------------------------------------------------------------------------

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    term: "ARBA",
    definition:
      "Agencia de Recaudación de la Provincia de Buenos Aires. Administra los impuestos provinciales (Inmobiliario, Sellos, Ingresos Brutos) y el catastro espacial.",
  },
  {
    term: "Boleto de compraventa",
    definition:
      "Contrato privado preliminar a la escritura. Obliga a las partes a escriturar en un plazo determinado. No transfiere propiedad por sí mismo — eso lo hace recién la escritura.",
  },
  {
    term: "Cédula catastral",
    definition:
      "Documento oficial emitido por ARBA que detalla los datos del inmueble: partida, nomenclatura, superficie, linderos. Algunos trámites lo exigen.",
  },
  {
    term: "Embargo",
    definition:
      "Medida cautelar judicial sobre un bien específico (el inmueble en este caso). Impide vender hasta que se levante. Aparece en el Informe de Dominio.",
  },
  {
    term: "Escribano",
    definition:
      "Notario público. Profesional de fe pública que redacta y firma la escritura. Su firma le da carácter de instrumento público al acto.",
  },
  {
    term: "Escritura traslativa de dominio",
    definition:
      "Instrumento público firmado por escribano que transfiere la propiedad. Es lo que te convierte en dueño legal frente al Registro.",
  },
  {
    term: "Expensas extraordinarias",
    definition:
      "Gastos del consorcio que no son los mensuales habituales — por ejemplo, una refacción importante o una mejora estructural. Suelen pagarse en cuotas y arrastrarse de un titular a otro.",
  },
  {
    term: "Ganancial",
    definition:
      "Régimen de bienes en el matrimonio donde lo adquirido durante la unión es de ambos cónyuges. Implica que para vender hace falta la firma de los dos.",
  },
  {
    term: "Hipoteca",
    definition:
      "Gravamen voluntario sobre el inmueble como garantía de una deuda (típicamente un crédito hipotecario). Aparece en el Informe de Dominio. Quien compra con hipoteca asume esa carga si no se cancela antes.",
  },
  {
    term: "Inhibición",
    definition:
      "Restricción judicial que impide a una persona disponer de sus bienes. Es personal — sigue a la persona, no al inmueble. Se verifica con un Informe de Inhibiciones.",
  },
  {
    term: "Instrumento privado",
    definition:
      "Documento firmado entre partes sin intervención de un escribano. Tiene validez pero no fe pública. La reserva y el boleto pueden ser instrumentos privados.",
  },
  {
    term: "Instrumento público",
    definition:
      "Documento firmado ante un funcionario habilitado (escribano, juez). Tiene fe pública: lo que dice se presume verdadero. La escritura es el ejemplo paradigmático.",
  },
  {
    term: "ITI",
    definition:
      "Impuesto a la Transferencia de Inmuebles. Lo paga el vendedor si la propiedad no era su vivienda única. Es del 1.5% del precio de venta. No aplica al comprador.",
  },
  {
    term: "Nomenclatura catastral",
    definition:
      "Identificador único de una parcela compuesto por: Partido - Circunscripción - Sección - Manzana - Parcela. Ejemplo: 065-25-7-7-50. Es lo que ARBA usa para diferenciar parcelas.",
  },
  {
    term: "Partida inmobiliaria",
    definition:
      "Número fiscal que identifica al inmueble en los registros de ARBA. Es lo que aparece en la boleta del Impuesto Inmobiliario.",
  },
  {
    term: "PH",
    definition:
      "Propiedad Horizontal. Régimen legal aplicado a edificios, departamentos y conjuntos donde múltiples unidades comparten partes comunes. Tiene su propio reglamento y administración.",
  },
  {
    term: "Registro de la Propiedad Inmueble (RPI)",
    definition:
      "Organismo provincial donde se inscriben las escrituras de inmuebles y los gravámenes que las afectan. Emite los Informes de Dominio e Inhibiciones.",
  },
  {
    term: "Reserva ad referéndum",
    definition:
      "Oferta de compra acompañada de un anticipo retenido en garantía. Te aparta la propiedad mientras hacés due diligence. Si te arrepentís, la perdés.",
  },
  {
    term: "Sellos",
    definition:
      "Impuesto provincial al acto jurídico (compraventa, locación). En PBA es del 1.2%-2.5% del precio, suele dividirse 50/50 entre comprador y vendedor.",
  },
  {
    term: "Testimonio",
    definition:
      "Copia firmada por el escribano de la escritura, con constancia de inscripción en el RPI. Es lo que te prueba legalmente que sos dueño.",
  },
  {
    term: "Usufructo",
    definition:
      "Derecho real que le permite a una persona usar y gozar de un inmueble sin ser dueña. Si el inmueble tiene usufructo, hay alguien que puede vivir ahí aunque vos lo compres.",
  },
];
