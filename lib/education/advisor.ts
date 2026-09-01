import {
  DOCUMENTS,
  PROCESS_STEPS,
  type DocumentInfo,
  type ProcessStep,
} from "./buying-process";
import { PAID_SERVICES_PUBLIC } from "@/lib/services/offering";

/**
 * Buying-process advisor.
 *
 * Given the buyer's declared stage (search_profiles.current_stage),
 * derives the context for the in-property advisor card:
 *
 *   - the current step (full ProcessStep object)
 *   - the next step (if any)
 *   - the documents associated with the current step
 *   - a "main action" — the next thing that moves the operation forward
 *     on the property they're viewing. Usually ours to do, not theirs:
 *     the copy here says who acts, because a guide that tells the reader
 *     to go get their own informes is describing a service the agency is
 *     not selling.
 *
 * Pure function: no I/O, no React. Caller renders the UI.
 */

export interface AdvisorContext {
  stage: ProcessStep;
  nextStage: ProcessStep | null;
  /** Documents that belong to the current stage. May be empty for
   *  stages 1, 2 and 6 — those are action-only. */
  currentDocs: DocumentInfo[];
  /** The single primary CTA to surface in the advisor card. */
  mainAction: AdvisorAction;
}

export type AdvisorAction =
  | {
      kind: "buy_service";
      documentSlug: string;
      serviceId: string;
      title: string;
      description: string;
    }
  | {
      kind: "external_action";
      title: string;
      description: string;
    }
  | {
      kind: "advance_stage";
      title: string;
      nextStageSlug: string;
      description: string;
    };

/**
 * Build the advisor context for a given stage slug. Returns null when
 * the slug is missing or unknown — caller should hide the card.
 */
export function getAdvisorContext(stageSlug: string | null): AdvisorContext | null {
  if (!stageSlug) return null;
  const idx = PROCESS_STEPS.findIndex((s) => s.slug === stageSlug);
  if (idx === -1) return null;
  const stage = PROCESS_STEPS[idx];
  const nextStage = PROCESS_STEPS[idx + 1] ?? null;

  const currentDocs = stage.documentSlugs.map((slug) => DOCUMENTS[slug]);

  return {
    stage,
    nextStage,
    currentDocs,
    mainAction: pickMainAction(stage, currentDocs, nextStage),
  };
}

function pickMainAction(
  stage: ProcessStep,
  docs: DocumentInfo[],
  nextStage: ProcessStep | null,
): AdvisorAction {
  // Stage 1 — pre-búsqueda: action is to start looking
  if (stage.slug === "pre-busqueda") {
    return {
      kind: "external_action",
      title: "Sentate con nosotros a ordenar el presupuesto",
      description:
        "Te decimos qué compra tu plata en cada zona del sur, con data real de mercado. Escribinos y arrancamos por ahí.",
    };
  }

  // Stage 2 — búsqueda: action is to save / compare
  if (stage.slug === "busqueda") {
    return {
      kind: "external_action",
      title: "Coordinamos la visita",
      description:
        "Vamos con vos y con la ficha catastral en la mano. Escribinos y la agendamos.",
    };
  }

  // Stage 3 — reserva
  if (stage.slug === "reserva") {
    return {
      kind: "external_action",
      title: "Negociamos el precio y redactamos la reserva",
      description:
        "Con comparables del mercado como argumento, y un plazo que alcance para verificar todo: nunca menos de 21 días.",
    };
  }

  // Stage 4 — due diligence: surface the most actionable paid service we
  // offer. Prefer cadastral_report since it's the only one currently
  // enabled and instant.
  if (stage.slug === "due-diligence") {
    const arba = PAID_SERVICES_PUBLIC
      ? docs.find((d) => d.serviceId === "cadastral_report")
      : undefined;
    if (arba && arba.serviceId) {
      return {
        kind: "buy_service",
        documentSlug: arba.slug,
        serviceId: arba.serviceId,
        title: `Te sacamos el ${arba.title}`,
        description:
          "Lo generamos al instante y te lo damos en PDF. Es el primer paso de la verificación catastral.",
      };
    }
    return {
      kind: "external_action",
      title: "Pedimos los informes",
      description:
        "Dominio, inhibiciones y libres deuda. Los leemos y te explicamos qué dice cada uno. Sin esto no se firma boleto.",
    };
  }

  // Stage 5 — boleto y escritura
  if (stage.slug === "boleto-y-escritura") {
    return {
      kind: "external_action",
      title: "Coordinamos con el escribano",
      description:
        "Le mandamos los informes vigentes y controlamos que no venza ninguno. De la firma del boleto a la escritura pasan 30 a 60 días.",
    };
  }

  // Stage 6 — post-escritura
  if (stage.slug === "post-escritura") {
    return {
      kind: "external_action",
      title: "Te seguimos el testimonio inscripto",
      description:
        "Se lo reclamamos al escribano hasta que lo tengas. Mientras tanto, cambiá los servicios a tu nombre: luz, gas, agua, internet.",
    };
  }

  // Fallback — shouldn't reach here
  if (nextStage) {
    return {
      kind: "advance_stage",
      title: `Avanzá a ${nextStage.title}`,
      nextStageSlug: nextStage.slug,
      description: `Cuando cerremos esta etapa seguimos con '${nextStage.title}'.`,
    };
  }
  return {
    kind: "external_action",
    title: "Terminaste el proceso",
    description: "Felicitaciones por tu nueva propiedad.",
  };
}
