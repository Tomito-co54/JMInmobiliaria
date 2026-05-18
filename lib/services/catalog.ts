/**
 * Service catalog — the menu of paid products Jotaeme offers.
 *
 * Pricing is a placeholder until the owner finalizes pricing post-MVP.
 * The `service_type` keys must match the enum in 00001_initial_schema.sql.
 */

export type ServiceTypeId =
  | "cadastral_report"
  | "dominion_report"
  | "dominion_report_urgent"
  | "cadastral_certificate"
  | "cedula_catastral"
  | "inhibition_report"
  | "market_appraisal"
  | "formal_appraisal"
  | "parcel_status"
  | "compra_segura_bundle";

export interface ServiceDefinition {
  id: ServiceTypeId;
  title: string;
  shortTitle: string;
  description: string;
  /** Bullet points shown on the catalog card. */
  highlights: string[];
  /** ARS for free tier services; USD reserved for premium. */
  price: number;
  currency: "ARS" | "USD";
  /** Display string for SLA, e.g. "Inmediato" or "24-48hs hábiles". */
  sla: string;
  /**
   * Whether this service is currently available for purchase.
   * MVP only enables `cadastral_report`; the rest stay defined so the
   * enum + types remain stable, but the catalog UI hides them.
   */
  available: boolean;
}

const CATALOG: Record<ServiceTypeId, ServiceDefinition> = {
  cadastral_report: {
    id: "cadastral_report",
    title: "Informe Catastral ARBA",
    shortTitle: "Informe Catastral",
    description:
      "Reporte oficial con los datos catastrales registrados en ARBA para la propiedad: partida, nomenclatura, superficie del lote y polígono catastral con coordenadas oficiales.",
    highlights: [
      "Partida y nomenclatura catastral verificadas",
      "Superficie ARBA del lote",
      "Plano del polígono oficial",
      "Coordenadas y datos del partido",
    ],
    price: 8000,
    currency: "ARS",
    sla: "Inmediato (PDF al instante)",
    available: true,
  },
  dominion_report: {
    id: "dominion_report",
    title: "Informe de Dominio",
    shortTitle: "Dominio",
    description:
      "Estado registral de la propiedad: titularidad actual, embargos, inhibiciones, gravámenes. Emitido por el Registro de la Propiedad Inmueble de PBA.",
    highlights: [
      "Titular registral actual",
      "Embargos e inhibiciones",
      "Hipotecas y gravámenes",
      "Histórico de transferencias",
    ],
    price: 25000,
    currency: "ARS",
    sla: "24-48hs hábiles",
    available: false,
  },
  dominion_report_urgent: {
    id: "dominion_report_urgent",
    title: "Informe de Dominio Urgente",
    shortTitle: "Dominio Urgente",
    description: "Igual al informe de dominio pero con prioridad de emisión.",
    highlights: ["Mismo contenido", "Prioridad de cola", "Entrega exprés"],
    price: 45000,
    currency: "ARS",
    sla: "Mismo día hábil",
    available: false,
  },
  cadastral_certificate: {
    id: "cadastral_certificate",
    title: "Certificado Catastral",
    shortTitle: "Certificado Catastral",
    description:
      "Certificado oficial requerido para escrituración. Requiere estado parcelario vigente firmado por agrimensor.",
    highlights: [
      "Apto para escrituración",
      "Validez oficial",
      "Requiere estado parcelario",
    ],
    price: 35000,
    currency: "ARS",
    sla: "5-10 días hábiles",
    available: false,
  },
  cedula_catastral: {
    id: "cedula_catastral",
    title: "Cédula Catastral",
    shortTitle: "Cédula",
    description: "Documento catastral oficial emitido por ARBA.",
    highlights: ["Documento oficial", "Apto para trámites"],
    price: 12000,
    currency: "ARS",
    sla: "1-3 días hábiles",
    available: false,
  },
  inhibition_report: {
    id: "inhibition_report",
    title: "Informe de Inhibiciones",
    shortTitle: "Inhibiciones",
    description:
      "Verificación de restricciones personales sobre el titular registral.",
    highlights: ["Sobre la persona titular", "Detección de inhibiciones"],
    price: 15000,
    currency: "ARS",
    sla: "24-48hs hábiles",
    available: false,
  },
  market_appraisal: {
    id: "market_appraisal",
    title: "Tasación de Mercado",
    shortTitle: "Tasación de Mercado",
    description:
      "Estimación de valor de mercado basada en comparables, calidad y zona.",
    highlights: ["Algorítmica + curada", "Comparables locales", "PDF detallado"],
    price: 18000,
    currency: "ARS",
    sla: "3-5 días hábiles",
    available: false,
  },
  formal_appraisal: {
    id: "formal_appraisal",
    title: "Tasación Formal",
    shortTitle: "Tasación Formal",
    description:
      "Tasación con firma de martillero o corredor matriculado, apta para garantías o juicios.",
    highlights: ["Firma profesional", "Apta para crédito", "Apta para tribunales"],
    price: 80000,
    currency: "ARS",
    sla: "7-15 días hábiles",
    available: false,
  },
  parcel_status: {
    id: "parcel_status",
    title: "Estado Parcelario",
    shortTitle: "Estado Parcelario",
    description:
      "Relevamiento parcelario con firma de agrimensor. Requerido para escrituración cuando el anterior está vencido.",
    highlights: ["Firmado por agrimensor", "Visita al lote", "Apto escritura"],
    price: 120000,
    currency: "ARS",
    sla: "10-20 días hábiles",
    available: false,
  },
  compra_segura_bundle: {
    id: "compra_segura_bundle",
    title: "Compra Segura",
    shortTitle: "Compra Segura",
    description:
      "Paquete que combina dominio + catastro + inhibiciones, con un único pago.",
    highlights: ["3 informes en uno", "Descuento sobre el precio suelto"],
    price: 45000,
    currency: "ARS",
    sla: "24-72hs hábiles",
    available: false,
  },
};

export function getServiceDefinition(id: ServiceTypeId): ServiceDefinition {
  const def = CATALOG[id];
  if (!def) throw new Error(`Unknown service_type: ${id}`);
  return def;
}

export function listAvailableServices(): ServiceDefinition[] {
  return Object.values(CATALOG).filter((s) => s.available);
}

export function listAllServices(): ServiceDefinition[] {
  return Object.values(CATALOG);
}
