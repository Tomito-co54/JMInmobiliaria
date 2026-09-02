import type { PublicArbaLookup, PublicPropertyRow } from "@/lib/db/properties";

/**
 * Derives the "Datos oficiales" list shown to buyers from raw property +
 * cadastral lookup data.
 *
 * The copy names no agency. The lookup behind it is unchanged — it is still
 * ARBA's WFS answering — but a buyer reading a listing is asking "did anyone
 * check this?", and the name of a provincial tax bureau is a heavier, more
 * technical answer than the question deserves. The agency is named where it
 * is the actual answer: the buying guide, next to each document it issues.
 *
 * It also stopped speaking as an auditor. "Lo que pudimos verificar", "m²
 * declarados", "el aviso no declaró" — all of it came from the upstream
 * portal, where the listing belonged to a stranger and the product was
 * doubting it. Here the listing is ours: we typed the partida, we loaded the
 * metres, and there is no third party whose claim needs checking. What is
 * missing is missing because we have not loaded it yet, and the copy now says
 * that instead of implying somebody withheld it.
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
  // 1. Parcela identificada — top of the list because it's the
  // single fact that anchors everything else.
  // -------------------------------------------------------------------------
  if (property.partida) {
    items.push({
      id: "parcela_arba",
      status: "verified",
      title: "Parcela identificada",
      detail: `Partida ${property.partida}`,
      termId: "partida",
    });
  } else {
    items.push({
      id: "parcela_arba",
      status: "missing",
      title: "Sin parcela identificada",
      detail:
        "Todavía no cargamos la partida de esta propiedad. Pedila por WhatsApp y te la pasamos.",
      termId: "partida",
    });
  }

  // -------------------------------------------------------------------------
  // 2. Coherencia de superficie — el segundo dato más importante.
  // -------------------------------------------------------------------------
  const declared = property.surface_total ?? property.surface_covered;
  const arba = property.surface_arba;

  // For a house the declared total is the LOT, which is the convention here,
  // so on its own it says nothing about how much of that lot is built. The
  // split is what the reader is actually asking. Derived and not stored: a
  // third column could disagree with the two it is made of.
  const covered = property.surface_covered;
  const split =
    declared !== null &&
    declared !== undefined &&
    covered !== null &&
    covered !== undefined &&
    declared > covered
      ? `, de los que ${covered} m² son cubiertos y ${
          Math.round((declared - covered) * 100) / 100
        } descubiertos`
      : "";

  if (declared !== null && declared !== undefined && arba !== null && arba !== undefined && arba > 0) {
    // No comparison, on purpose — same reason the score's coherence sub-score
    // is parked (see ARBA_COHERENCE_PARKED in lib/scoring/subscores.ts).
    // `surface_arba` is the PARCEL. The declared surface is the unit, or the
    // built area. Calling the gap between them a "discrepancia" flagged 79% of
    // departamentos as suspect for being departamentos — on the one page whose
    // job is to say what has been verified. Both numbers are reported, each as
    // what it is, and the reader is not told they should match.
    items.push({
      id: "superficie",
      status: "verified",
      title: "Superficie",
      detail: `La parcela mide ${arba} m² y esta propiedad ${declared} m²${split}. En departamentos y PH la parcela es la del edificio entero, no la de la unidad.`,
      termId: "superficie_arba",
    });
  } else if (arba !== null && arba !== undefined) {
    items.push({
      id: "superficie",
      status: "warning",
      title: "Superficie de la parcela",
      detail: `${arba} m² en el catastro. Todavía no cargamos los metros de la propiedad.`,
      termId: "superficie_arba",
    });
  } else if (declared !== null && declared !== undefined) {
    items.push({
      id: "superficie",
      status: "warning",
      title: "Superficie de la propiedad",
      detail: `${declared} m². El catastro todavía no nos devolvió la parcela.`,
      termId: "superficie_total",
    });
  } else {
    items.push({
      id: "superficie",
      status: "missing",
      title: "Sin superficie cargada",
      detail: "Todavía no cargamos los metros y el catastro no devolvió la parcela.",
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
        title: "Ubicación confirmada en la parcela",
        detail: "Las coordenadas caen dentro del polígono oficial de la parcela.",
        termId: "match_intersects",
      });
    } else if (arbaLookup.match_strategy === "dwithin") {
      const d = arbaLookup.distance_meters;
      items.push({
        id: "match",
        status: "warning",
        title: "Ubicación aproximada",
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
