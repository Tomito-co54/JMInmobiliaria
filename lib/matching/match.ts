/**
 * Match score — pure aggregation of 7 sub-scores against a search profile.
 *
 *   computeMatchScore(property, profile) → MatchBreakdown
 *
 * Same shape as the quality score so admin tooling, tests, and breakdown
 * UIs can stay consistent. The big conceptual difference: this is
 * subjective — given the same property, different profiles produce
 * different scores.
 *
 * Design notes (locked with the owner):
 *   - Zone has 3 priority levels (preferido / aceptable / descarte).
 *   - No hard-zero cliffs: even a profile-property mismatch (wrong type,
 *     descarte zone) lands in the 5-15 range so the full scale is usable.
 *     The product surface decides whether to filter or just show the bad
 *     match.
 *   - Sub-scores without applicable profile data (e.g. profile didn't set
 *     rooms_min) are skipped (confidence 0) and the total is renormalized
 *     over what was evaluable.
 */

import { countMustHavesFulfilled } from "./must-haves";
import {
  MATCH_ALGORITHM_VERSION,
  MATCH_MIN_EFFECTIVE_WEIGHT_RATIO,
  MATCH_SUBSCORE_WEIGHTS,
  type MatchBreakdown,
  type MatchSubScore,
  type MatchSubScoreBody,
  type MatchSubScoreId,
  type PropertyForMatching,
  type SearchProfileForMatching,
  type ZonePref,
} from "./types";

const W = MATCH_SUBSCORE_WEIGHTS;

// ---------------------------------------------------------------------------
// Sub-score: zone
// ---------------------------------------------------------------------------

function findZonePref(zones: ZonePref[], partido: string | null): ZonePref | null {
  if (!partido) return null;
  const normalized = partido.trim().toLowerCase();
  return (
    zones.find((z) => z.partido.trim().toLowerCase() === normalized) ?? null
  );
}

function zoneSubScore(p: PropertyForMatching, profile: SearchProfileForMatching): MatchSubScore {
  const hasZonePrefs = profile.zones.length > 0;
  if (!hasZonePrefs) {
    return {
      id: "zone",
      value: 50,
      weight: W.zone,
      confidence: 0.3,
      reason: "Tu perfil no especifica zonas — todo cuenta como neutral",
      verdict: "partial",
    };
  }
  if (!p.partido) {
    return {
      id: "zone",
      value: 50,
      weight: W.zone,
      confidence: 0.3,
      reason: "La propiedad no tiene partido identificado",
      verdict: "partial",
    };
  }
  const pref = findZonePref(profile.zones, p.partido);
  if (!pref) {
    return {
      id: "zone",
      value: 30,
      weight: W.zone,
      confidence: 1.0,
      reason: `${p.partido} no está en tu lista de zonas`,
      verdict: "partial",
    };
  }
  if (pref.priority === "preferido") {
    return {
      id: "zone",
      value: 100,
      weight: W.zone,
      confidence: 1.0,
      reason: `${p.partido} está marcada como zona preferida`,
      verdict: "fulfilled",
    };
  }
  if (pref.priority === "aceptable") {
    return {
      id: "zone",
      value: 70,
      weight: W.zone,
      confidence: 1.0,
      reason: `${p.partido} está marcada como zona aceptable`,
      verdict: "partial",
    };
  }
  // descarte
  return {
    id: "zone",
    value: 10,
    weight: W.zone,
    confidence: 1.0,
    reason: `${p.partido} está marcada como zona a descartar`,
    verdict: "unfulfilled",
  };
}

// ---------------------------------------------------------------------------
// Sub-score: price
// ---------------------------------------------------------------------------

function priceSubScore(p: PropertyForMatching, profile: SearchProfileForMatching): MatchSubScore {
  const noMin = profile.price_min === null;
  const noMax = profile.price_max === null;

  if (noMin && noMax) {
    return {
      id: "price",
      value: 50,
      weight: W.price,
      confidence: 0,
      reason: "Tu perfil no especifica rango de precio",
      verdict: "partial",
    };
  }

  if (p.price_amount === null || p.price_currency === null) {
    return {
      id: "price",
      value: 30,
      weight: W.price,
      confidence: 0.3,
      reason: "La propiedad no publica precio",
      verdict: "partial",
    };
  }

  if (profile.price_currency !== p.price_currency) {
    return {
      id: "price",
      value: 30,
      weight: W.price,
      confidence: 0.3,
      reason: `Tu rango está en ${profile.price_currency} y la propiedad en ${p.price_currency} — no comparable directo`,
      verdict: "partial",
    };
  }

  const price = p.price_amount;
  const lo = profile.price_min;
  const hi = profile.price_max;

  // Below min — for a buyer this is *good* (cheaper), full credit.
  if (lo !== null && price < lo) {
    return {
      id: "price",
      value: 100,
      weight: W.price,
      confidence: 1.0,
      reason: `Por debajo de tu mínimo (${profile.price_currency} ${price.toLocaleString("es-AR")})`,
      verdict: "fulfilled",
    };
  }

  // Within range.
  if (hi === null || price <= hi) {
    return {
      id: "price",
      value: 100,
      weight: W.price,
      confidence: 1.0,
      reason: `Dentro de tu rango (${profile.price_currency} ${price.toLocaleString("es-AR")})`,
      verdict: "fulfilled",
    };
  }

  // Over max — piecewise.
  const over = (price - hi) / hi;
  let value: number;
  let verdict: MatchSubScore["verdict"];
  if (over <= 0.10) {
    value = 70;
    verdict = "partial";
  } else if (over <= 0.25) {
    value = 40;
    verdict = "partial";
  } else if (over <= 0.50) {
    value = 20;
    verdict = "unfulfilled";
  } else {
    value = 5;
    verdict = "unfulfilled";
  }
  const overPct = Math.round(over * 100);
  return {
    id: "price",
    value,
    weight: W.price,
    confidence: 1.0,
    reason: `${overPct}% por encima de tu máximo (${profile.price_currency} ${hi.toLocaleString("es-AR")})`,
    verdict,
  };
}

// ---------------------------------------------------------------------------
// Sub-score: property type
// ---------------------------------------------------------------------------

function typeSubScore(p: PropertyForMatching, profile: SearchProfileForMatching): MatchSubScore {
  if (profile.property_types.length === 0) {
    return {
      id: "type",
      value: 70,
      weight: W.type,
      confidence: 0.3,
      reason: "Tu perfil no especifica tipo — vale cualquiera",
      verdict: "partial",
    };
  }
  if (!p.property_type) {
    return {
      id: "type",
      value: 40,
      weight: W.type,
      confidence: 0.3,
      reason: "La propiedad no declara tipo",
      verdict: "partial",
    };
  }
  if (profile.property_types.includes(p.property_type)) {
    return {
      id: "type",
      value: 100,
      weight: W.type,
      confidence: 1.0,
      reason: `${p.property_type} está en tus tipos buscados`,
      verdict: "fulfilled",
    };
  }
  return {
    id: "type",
    value: 10,
    weight: W.type,
    confidence: 1.0,
    reason: `Buscás ${profile.property_types.join(", ")} y esta es ${p.property_type}`,
    verdict: "unfulfilled",
  };
}

// ---------------------------------------------------------------------------
// Sub-score: operation type
// ---------------------------------------------------------------------------

function operationSubScore(p: PropertyForMatching, profile: SearchProfileForMatching): MatchSubScore {
  if (profile.operation_type === null) {
    return {
      id: "operation",
      value: 80,
      weight: W.operation,
      confidence: 0.3,
      reason: "Tu perfil acepta venta o alquiler",
      verdict: "partial",
    };
  }
  if (!p.operation_type) {
    return {
      id: "operation",
      value: 40,
      weight: W.operation,
      confidence: 0.3,
      reason: "La propiedad no declara operación",
      verdict: "partial",
    };
  }
  if (profile.operation_type === p.operation_type) {
    return {
      id: "operation",
      value: 100,
      weight: W.operation,
      confidence: 1.0,
      reason: `Operación ${p.operation_type} — coincide con tu búsqueda`,
      verdict: "fulfilled",
    };
  }
  return {
    id: "operation",
    value: 10,
    weight: W.operation,
    confidence: 1.0,
    reason: `Buscás ${profile.operation_type} y esta es de ${p.operation_type}`,
    verdict: "unfulfilled",
  };
}

// ---------------------------------------------------------------------------
// Sub-score: rooms
// ---------------------------------------------------------------------------

function roomsSubScore(p: PropertyForMatching, profile: SearchProfileForMatching): MatchSubScore {
  if (profile.rooms_min === null) {
    return {
      id: "rooms",
      value: 70,
      weight: W.rooms,
      confidence: 0,
      reason: "Tu perfil no especifica ambientes mínimos",
      verdict: "partial",
    };
  }
  if (p.rooms === null) {
    return {
      id: "rooms",
      value: 50,
      weight: W.rooms,
      confidence: 0.3,
      reason: "La propiedad no declara cantidad de ambientes",
      verdict: "partial",
    };
  }
  const diff = p.rooms - profile.rooms_min;
  if (diff >= 0) {
    return {
      id: "rooms",
      value: 100,
      weight: W.rooms,
      confidence: 1.0,
      reason: `${p.rooms} amb cubre tu mínimo de ${profile.rooms_min}`,
      verdict: "fulfilled",
    };
  }
  // Short of minimum.
  let value: number;
  if (diff === -1) value = 60;
  else if (diff === -2) value = 20;
  else value = 5;
  return {
    id: "rooms",
    value,
    weight: W.rooms,
    confidence: 1.0,
    reason: `${p.rooms} amb · te faltan ${Math.abs(diff)} para tu mínimo`,
    verdict: value >= 50 ? "partial" : "unfulfilled",
  };
}

// ---------------------------------------------------------------------------
// Sub-score: surface
// ---------------------------------------------------------------------------

function surfaceSubScore(p: PropertyForMatching, profile: SearchProfileForMatching): MatchSubScore {
  if (profile.surface_min === null) {
    return {
      id: "surface",
      value: 70,
      weight: W.surface,
      confidence: 0,
      reason: "Tu perfil no especifica superficie mínima",
      verdict: "partial",
    };
  }
  const surface = p.surface_arba ?? p.surface_total ?? null;
  if (surface === null) {
    return {
      id: "surface",
      value: 50,
      weight: W.surface,
      confidence: 0.3,
      reason: "La propiedad no tiene superficie verificable",
      verdict: "partial",
    };
  }
  const ratio = surface / profile.surface_min;
  let value: number;
  let verdict: MatchSubScore["verdict"];
  if (ratio >= 1) {
    value = 100;
    verdict = "fulfilled";
  } else if (ratio >= 0.9) {
    value = 75;
    verdict = "partial";
  } else if (ratio >= 0.75) {
    value = 40;
    verdict = "partial";
  } else if (ratio >= 0.5) {
    value = 15;
    verdict = "unfulfilled";
  } else {
    value = 5;
    verdict = "unfulfilled";
  }
  return {
    id: "surface",
    value,
    weight: W.surface,
    confidence: 1.0,
    reason: `${surface}m² vs tu mínimo de ${profile.surface_min}m²`,
    verdict,
  };
}

// ---------------------------------------------------------------------------
// Sub-score: must-haves
// ---------------------------------------------------------------------------

function mustHavesSubScore(p: PropertyForMatching, profile: SearchProfileForMatching): MatchSubScore {
  if (profile.must_haves.length === 0) {
    return {
      id: "must_haves",
      value: 70,
      weight: W.must_haves,
      confidence: 0,
      reason: "Tu perfil no tiene no-negociables",
      verdict: "partial",
    };
  }
  const { fulfilled, missing } = countMustHavesFulfilled(p, profile.must_haves);
  const total = profile.must_haves.length;
  const ratio = fulfilled.length / total;
  const value = Math.round(ratio * 100);
  let verdict: MatchSubScore["verdict"];
  if (ratio === 1) verdict = "fulfilled";
  else if (ratio >= 0.5) verdict = "partial";
  else verdict = "unfulfilled";
  const reason =
    missing.length === 0
      ? `Cumple los ${total} no-negociables`
      : `Cumple ${fulfilled.length}/${total} — falta: ${missing.join(", ")}`;
  return {
    id: "must_haves",
    value,
    weight: W.must_haves,
    confidence: 1.0,
    reason,
    verdict,
  };
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

export function computeMatchScore(
  property: PropertyForMatching,
  profile: SearchProfileForMatching,
): MatchBreakdown {
  const subs: MatchSubScore[] = [
    zoneSubScore(property, profile),
    priceSubScore(property, profile),
    typeSubScore(property, profile),
    operationSubScore(property, profile),
    roomsSubScore(property, profile),
    surfaceSubScore(property, profile),
    mustHavesSubScore(property, profile),
  ];

  const nominalWeight = subs.reduce((acc, s) => acc + s.weight, 0);
  const effectiveWeight = subs.reduce(
    (acc, s) => acc + s.weight * s.confidence,
    0,
  );
  const ratio = nominalWeight === 0 ? 0 : effectiveWeight / nominalWeight;
  const insufficient = ratio < MATCH_MIN_EFFECTIVE_WEIGHT_RATIO;

  let score: number | null;
  if (effectiveWeight === 0 || insufficient) {
    score = null;
  } else {
    const weighted = subs.reduce(
      (acc, s) => acc + s.value * s.weight * s.confidence,
      0,
    );
    score = Math.round(weighted / effectiveWeight);
  }

  const subscores = {} as Record<MatchSubScoreId, MatchSubScoreBody>;
  for (const s of subs) {
    const { id, ...rest } = s;
    subscores[id] = rest;
  }

  return {
    score,
    computed_at: new Date().toISOString(),
    algorithm_version: MATCH_ALGORITHM_VERSION,
    effective_weight_ratio: Math.round(ratio * 1000) / 1000,
    insufficient_data: insufficient,
    subscores,
  };
}
