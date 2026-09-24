/**
 * The services on /servicios — plain data, like the buying guide
 * (lib/education/buying-process.ts), so the copy can be edited without
 * touching a component.
 *
 * Decided by Tomy on 24-sep-2026: appraisals, surveying (estado parcelario,
 * mensura y subdivisión) and municipal architecture (planos, demoliciones);
 * done by the agency itself; no prices — every job is quoted for the property,
 * and the page says so; each service asks through WhatsApp with its own
 * message, so the first line he reads already names what is being asked.
 *
 * This is not the paid-services subsystem that was deleted on 2-sep
 * (MercadoPago, the automated ARBA report). Nothing here is bought on the
 * page: it describes work and opens a conversation.
 *
 * Same voice as the guide: impersonal, sober, no costs or timeframes.
 */

export type ServiceAreaSlug = "tasaciones" | "agrimensura" | "arquitectura";

export type ServiceIcon = "tasacion" | "estado-parcelario" | "mensura" | "planos" | "demolicion";

export interface Service {
  slug: string;
  title: string;
  icon: ServiceIcon;
  /** One or two sentences: what the work is. */
  summary: string;
  /** When someone needs it, as short situations. */
  when: string[];
  /** Pre-filled WhatsApp message. */
  message: string;
}

export interface ServiceArea {
  slug: ServiceAreaSlug;
  title: string;
  intro: string;
  services: Service[];
}

export const SERVICE_AREAS: ServiceArea[] = [
  {
    slug: "tasaciones",
    title: "Tasaciones",
    intro: "El valor de un inmueble, fundado en el mercado de la zona.",
    services: [
      {
        slug: "tasacion",
        title: "Tasación",
        icon: "tasacion",
        summary:
          "Estimación del valor de mercado de una propiedad a partir de su ubicación, su superficie, su estado y las operaciones comparables de la zona.",
        when: [
          "Antes de poner una propiedad en venta, para publicarla en su precio.",
          "Antes de comprar, para saber si el precio pedido es razonable.",
          "En sucesiones, divisiones de bienes o acuerdos entre partes.",
        ],
        message: "Hola Jotaeme, quiero consultar por una tasación.",
      },
    ],
  },
  {
    slug: "agrimensura",
    title: "Agrimensura",
    intro: "Las medidas, los límites y la división de una parcela.",
    services: [
      {
        slug: "estado-parcelario",
        title: "Estado parcelario",
        icon: "estado-parcelario",
        summary:
          "Relevamiento de la parcela que verifica su estado y corrobora que medidas, límites y construcciones coincidan con lo registrado.",
        when: [
          "Para escriturar: el escribano no puede hacerlo sin un estado parcelario vigente.",
          "Cuando el anterior está vencido, o la parcela nunca tuvo uno.",
        ],
        message: "Hola Jotaeme, quiero consultar por un estado parcelario.",
      },
      {
        slug: "mensura-y-subdivision",
        title: "Mensura y subdivisión",
        icon: "mensura",
        summary:
          "Planos que determinan los límites de un inmueble y, cuando corresponde, lo dividen: en lotes, o en unidades funcionales para afectarlo a propiedad horizontal.",
        when: [
          "Para dividir un lote en dos o más.",
          "Para afectar un edificio a propiedad horizontal y vender sus unidades por separado.",
          "Para unificar parcelas o resolver diferencias de medidas.",
        ],
        message: "Hola Jotaeme, quiero consultar por una mensura o subdivisión.",
      },
    ],
  },
  {
    slug: "arquitectura",
    title: "Arquitectura",
    intro: "Lo construido, en regla ante el municipio.",
    services: [
      {
        slug: "planos-municipales",
        title: "Planos municipales",
        icon: "planos",
        summary:
          "Planos de obra ante el municipio: de construcción nueva, de ampliación, o de regularización de lo construido sin declarar.",
        when: [
          "Para construir o ampliar.",
          "Para declarar construcciones que no figuran en los planos aprobados.",
          "Para vender con la construcción en regla.",
        ],
        message: "Hola Jotaeme, quiero consultar por planos municipales.",
      },
      {
        slug: "demoliciones",
        title: "Demoliciones",
        icon: "demolicion",
        summary:
          "Demolición total o parcial, con el permiso y el plano de demolición ante el municipio.",
        when: [
          "Antes de construir de nuevo sobre el mismo lote.",
          "Para dar de baja construcciones que ya no se usan.",
        ],
        message: "Hola Jotaeme, quiero consultar por una demolición.",
      },
    ],
  },
];

/** For a request that is not on the list. */
export const OTHER_SERVICE_MESSAGE = "Hola Jotaeme, quiero consultar por un servicio.";
