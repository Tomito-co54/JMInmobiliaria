import type { PublicArbaLookup, PublicPropertyRow } from "@/lib/db/properties";

/**
 * Derives the "Datos oficiales" list shown to buyers from raw property +
 * ARBA lookup data.
 *
 * The principle: each item answers a yes/no question that matters for the
 * buyer's confidence. We classify into three levels — verified / warning /
 * missing — and rely on lucide icons in the UI to convey the level.
 *
 * Pure function, no I/O — easy to test with fixtures.
 */

export type VerifiedDataStatus = "verified" | "warning" | "missing";

export interface VerifiedDataItem {
  id: string;
  status: VerifiedDataStatus;
  title: string;
  detail: string | null;
  /** Optional glossary term id; renders the title with a TermDefinition tooltip. */
  termId?: string;
}

export function deriveVerifiedDataItems(
  property: Pick<
    PublicPropertyRow,
    | "partida"
    | "nomenclatura_catastral"
    | "surface_arba"
    | "surface_total"
    | "surface_covered"
    | "lat"
    | "lng"
  >,
  arbaLookup: PublicArbaLookup | null,
): VerifiedDataItem[] {
  const items: VerifiedDataItem[] = [];

  // -------------------------------------------------------------------------
  // 1. Parcela identificada en ARBA — top of the list because it's the
  // single fact that anchors everything else.
  // -------------------------------------------------------------------------
  if (property.partida) {
    items.push({
      id: "parcela_arba",
      status: "verified",
      title: "Parcela identificada en ARBA",
      detail: `Partida ${property.partida}`,
      termId: "partida",
    });
  } else {
    items.push({
      id: "parcela_arba",
      status: "missing",
      title: "Sin parcela identificada en ARBA",
      detail:
        "No pudimos cruzar la dirección con el registro catastral. Puede deberse a dirección ambigua o a una propiedad nueva.",
      termId: "partida",
    });
  }

  // -------------------------------------------------------------------------
  // 2. Coherencia de superficie — el segundo dato más importante.
  // -------------------------------------------------------------------------
  const declared = property.surface_total ?? property.surface_covered;
  const arba = property.surface_arba;

  if (declared !== null && declared !== undefined && arba !== null && arba !== undefined && arba > 0) {
    const diff = Math.abs(declared - arba) / arba;
    const declaredFmt = `${declared}m²`;
    const arbaFmt = `${arba}m²`;
    if (diff <= 0.10) {
      items.push({
        id: "superficie",
        status: "verified",
        title: "Superficie coincide con ARBA",
        detail: `${declaredFmt} declarada · ${arbaFmt} ARBA`,
      });
    } else if (diff <= 0.25) {
      items.push({
        id: "superficie",
        status: "warning",
        title: "Superficie con leve discrepancia",
        detail: `${declaredFmt} declarada vs ${arbaFmt} ARBA (${Math.round(diff * 100)}% off)`,
      });
    } else {
      items.push({
        id: "superficie",
        status: "missing",
        title: "Discrepancia importante en superficie",
        detail: `${declaredFmt} declarada vs ${arbaFmt} ARBA (${Math.round(diff * 100)}% off). En departamentos suele significar que el aviso mide la unidad y ARBA mide el terreno completo.`,
      });
    }
  } else if (arba !== null && arba !== undefined) {
    items.push({
      id: "superficie",
      status: "warning",
      title: "Solo superficie ARBA disponible",
      detail: `${arba}m² registrados en ARBA — el aviso no declaró superficie para cruzar.`,
      termId: "superficie_arba",
    });
  } else if (declared !== null && declared !== undefined) {
    items.push({
      id: "superficie",
      status: "warning",
      title: "Superficie no verificable",
      detail: `${declared}m² declarada por el aviso — sin contraparte ARBA para confirmar.`,
      termId: "superficie_total",
    });
  } else {
    items.push({
      id: "superficie",
      status: "missing",
      title: "Sin superficie disponible",
      detail: "Ni el aviso ni ARBA registran metros cuadrados para esta propiedad.",
    });
  }

  // -------------------------------------------------------------------------
  // 3. Nomenclatura catastral — solo aparece si la tenemos.
  // -------------------------------------------------------------------------
  if (property.nomenclatura_catastral) {
    items.push({
      id: "nomenclatura",
      status: "verified",
      title: "Nomenclatura catastral",
      detail: property.nomenclatura_catastral,
      termId: "nomenclatura_catastral",
    });
  }

  // -------------------------------------------------------------------------
  // 4. Match strategy — si hubo lookup, contamos cómo fue.
  // -------------------------------------------------------------------------
  if (arbaLookup) {
    if (arbaLookup.match_strategy === "intersects") {
      items.push({
        id: "match",
        status: "verified",
        title: "Match ARBA exacto",
        detail: "Las coordenadas caen dentro del polígono oficial de la parcela.",
        termId: "match_intersects",
      });
    } else if (arbaLookup.match_strategy === "dwithin") {
      const d = arbaLookup.distance_meters;
      items.push({
        id: "match",
        status: "warning",
        title: "Match ARBA por proximidad",
        detail:
          d !== null && d !== undefined
            ? `Parcela cercana a ${Math.round(d)}m — la dirección puede ser imprecisa.`
            : "Parcela cercana — la dirección puede ser imprecisa.",
        termId: "match_intersects",
      });
    }
  }

  return items;
}
