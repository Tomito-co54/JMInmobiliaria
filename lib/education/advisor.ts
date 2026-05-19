import {
  DOCUMENTS,
  PROCESS_STEPS,
  type DocumentInfo,
  type ProcessStep,
} from "./buying-process";

/**
 * Buying-process advisor.
 *
 * Given the buyer's declared stage (search_profiles.current_stage),
 * derives the context for the in-property advisor card:
 *
 *   - the current step (full ProcessStep object)
 *   - the next step (if any)
 *   - the documents associated with the current step
 *   - a "main action" — the single most important thing they should
 *     do next on the property they're viewing
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
      title: "Definí presupuesto y criterios",
      description:
        "Cuando tengas claro qué buscás, marcá la siguiente etapa en tu perfil de búsqueda.",
    };
  }

  // Stage 2 — búsqueda: action is to save / compare
  if (stage.slug === "busqueda") {
    return {
      kind: "external_action",
      title: "Guardá la propiedad y compará",
      description:
        "Tocá el corazón para guardarla. Si te encaja, avanzá a 'Reserva' en tu perfil.",
    };
  }

  // Stage 3 — reserva
  if (stage.slug === "reserva") {
    return {
      kind: "external_action",
      title: "Firmá la reserva con plazo suficiente",
      description:
        "Pedí al menos 21 días para hacer la due diligence. Cuando firmes, avanzá a 'Pidiendo informes'.",
    };
  }

  // Stage 4 — due diligence: surface the most actionable paid service we
  // offer. Prefer cadastral_report since it's the only one currently
  // enabled and instant.
  if (stage.slug === "due-diligence") {
    const arba = docs.find((d) => d.serviceId === "cadastral_report");
    if (arba && arba.serviceId) {
      return {
        kind: "buy_service",
        documentSlug: arba.slug,
        serviceId: arba.serviceId,
        title: `Pedí el ${arba.title}`,
        description:
          "Te lo entregamos al instante en PDF — es el primer paso del due diligence catastral.",
      };
    }
    return {
      kind: "external_action",
      title: "Pedí los informes del due diligence",
      description: "Dominio, inhibiciones, libres deuda. Sin esto no se firma boleto.",
    };
  }

  // Stage 5 — boleto y escritura
  if (stage.slug === "boleto-y-escritura") {
    return {
      kind: "external_action",
      title: "Coordiná con tu escribano",
      description:
        "Pedile los informes actualizados que aún no tenés. La escritura demora 30-60 días después del boleto.",
    };
  }

  // Stage 6 — post-escritura
  if (stage.slug === "post-escritura") {
    return {
      kind: "external_action",
      title: "Cambiá la titularidad de servicios",
      description:
        "Luz, gas, agua, internet, expensas. Pedile el testimonio inscripto al escribano si no llegó en 60 días.",
    };
  }

  // Fallback — shouldn't reach here
  if (nextStage) {
    return {
      kind: "advance_stage",
      title: `Avanzá a ${nextStage.title}`,
      nextStageSlug: nextStage.slug,
      description: `Cuando termines lo de esta etapa, marcá '${nextStage.title}' en tu perfil.`,
    };
  }
  return {
    kind: "external_action",
    title: "Terminaste el proceso",
    description: "Felicitaciones por tu nueva propiedad.",
  };
}
