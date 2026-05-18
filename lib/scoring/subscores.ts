import type { ScoringInput, SubScore } from "./types";
import { SUBSCORE_WEIGHTS } from "./types";

/**
 * The 5 sub-scores that compose the quality score. Each is a pure function
 * over a ScoringInput — no I/O — so they're trivially testable with
 * fixtures.
 *
 * Each sub-score reports its own confidence (0-1). Sub-scores with
 * confidence=0 are skipped at the aggregation step (see quality.ts), so a
 * property with missing data isn't penalized — the total reflects only
 * what we could actually evaluate.
 */

// ---------------------------------------------------------------------------
// 1. Listing quality — how well-presented the listing is.
// ---------------------------------------------------------------------------

const ASK_PRICE_RX = /(consultar\s+(precio|valor)|precio\s+a\s+consultar|a\s+convenir)/i;

export function listingQualitySubScore(input: ScoringInput): SubScore {
  const {
    description,
    photos,
    rooms,
    bedrooms,
    bathrooms,
    surface_total,
    garages,
    price_amount,
  } = input.property;

  const descLen = (description ?? "").trim().length;
  let descPts = 0;
  if (descLen >= 800) descPts = 30;
  else if (descLen >= 200) descPts = 25;
  else if (descLen >= 1) descPts = 10;

  const photoCount = Array.isArray(photos) ? photos.length : 0;
  let photoPts = 0;
  if (photoCount >= 5) photoPts = 30;
  else if (photoCount >= 2) photoPts = 20;
  else if (photoCount === 1) photoPts = 10;

  // +5 per declared field, max 25.
  const declaredFields = [rooms, bedrooms, bathrooms, surface_total, garages].filter(
    (v) => v !== null && v !== undefined,
  ).length;
  const fieldPts = declaredFields * 5;

  // Penalty: hides price behind "consultar" while price_amount is null.
  const askPrice = !!description && ASK_PRICE_RX.test(description);
  const noPrice = price_amount === null || price_amount === undefined;
  const penalty = askPrice && noPrice ? -20 : 0;

  const raw = descPts + photoPts + fieldPts + penalty;
  const value = Math.max(0, Math.min(100, raw));

  const parts: string[] = [];
  parts.push(`desc ${descLen}ch`);
  parts.push(`${photoCount} foto${photoCount === 1 ? "" : "s"}`);
  parts.push(`${declaredFields}/5 campos`);
  if (penalty < 0) parts.push("precio oculto (-20)");

  return {
    id: "listing_quality",
    value,
    weight: SUBSCORE_WEIGHTS.listing_quality,
    confidence: 1.0,
    reason: parts.join(" · "),
    details: { descPts, photoPts, fieldPts, penalty, descLen, photoCount, declaredFields },
  };
}

// ---------------------------------------------------------------------------
// 2. Documentation — extensible list of components.
//
// Each component has a weight and an applies/present pair. The sub-score
// value is (Σ weight where present) / (Σ weight where applies) · 100.
//
// Today only ARBA-derived components apply. When Fase 2 brings owner-direct
// publishing, we add components like "escritura_uploaded" whose `applies`
// depends on the listing source — they don't penalize scraped listings, but
// do penalize publishers that don't upload them.
// ---------------------------------------------------------------------------

export interface DocComponent {
  id: string;
  label: string;
  weight: number;
  applies: boolean;
  present: boolean;
}

export function buildDocumentationComponents(input: ScoringInput): DocComponent[] {
  const p = input.property;
  return [
    {
      id: "arba_partida",
      label: "Partida ARBA identificada",
      weight: 30,
      applies: true,
      present: !!p.partida,
    },
    {
      id: "arba_nomenclatura",
      label: "Nomenclatura catastral",
      weight: 20,
      applies: true,
      present: !!p.nomenclatura_catastral,
    },
    {
      id: "arba_superficie",
      label: "Superficie ARBA",
      weight: 20,
      applies: true,
      present: p.surface_arba !== null && p.surface_arba !== undefined,
    },
    {
      id: "geocoded",
      label: "Coordenadas geográficas",
      weight: 15,
      applies: true,
      present: p.lat !== null && p.lng !== null,
    },
    {
      id: "arba_match_exact",
      label: "Match ARBA por intersección exacta",
      weight: 15,
      // Only applies when we actually looked it up (have coords + cached result).
      // Otherwise it's neither a credit nor a strike.
      applies: input.arbaLookup !== null,
      present: input.arbaLookup?.matchStrategy === "intersects",
    },
    // Fase 2 placeholders (add when owner-direct publishing comes online):
    // { id: "escritura_uploaded",     ... applies: p.source === "owner_direct" || p.source === "agency" ... },
    // { id: "informe_dominio_reciente", ... },
    // { id: "plano_aprobado",         ... },
    // { id: "titular_verificado",     ... },
  ];
}

export function documentationSubScore(input: ScoringInput): SubScore {
  const components = buildDocumentationComponents(input);
  const applicable = components.filter((c) => c.applies);
  const applicableWeight = applicable.reduce((acc, c) => acc + c.weight, 0);
  const obtainedWeight = applicable
    .filter((c) => c.present)
    .reduce((acc, c) => acc + c.weight, 0);

  if (applicableWeight === 0) {
    return {
      id: "documentation",
      value: 0,
      weight: SUBSCORE_WEIGHTS.documentation,
      confidence: 0,
      reason: "Ningún componente de documentación aplica",
      details: { components },
    };
  }

  const value = Math.round((obtainedWeight / applicableWeight) * 100);
  const presentIds = applicable.filter((c) => c.present).map((c) => c.id);
  const reason =
    presentIds.length === 0
      ? "Sin documentación verificable"
      : `${presentIds.length}/${applicable.length} componentes presentes`;

  return {
    id: "documentation",
    value,
    weight: SUBSCORE_WEIGHTS.documentation,
    confidence: 1.0,
    reason,
    details: { components, obtainedWeight, applicableWeight },
  };
}

// ---------------------------------------------------------------------------
// 3. ARBA coherence — declared surface vs ARBA-verified surface.
//
// Skipped silently when we can't cross-check. When we can, banded by diff %.
// ---------------------------------------------------------------------------

export function arbaCoherenceSubScore(input: ScoringInput): SubScore {
  const declared = input.property.surface_total ?? input.property.surface_covered ?? null;
  const arba = input.property.surface_arba ?? null;
  const weight = SUBSCORE_WEIGHTS.arba_coherence;

  if (declared === null && arba === null) {
    return {
      id: "arba_coherence",
      value: 0,
      weight,
      confidence: 0,
      reason: "Sin superficie declarada ni ARBA",
    };
  }

  if (declared === null || arba === null) {
    return {
      id: "arba_coherence",
      value: 60,
      weight,
      confidence: 0.3,
      reason:
        declared === null
          ? "Solo ARBA disponible — sin superficie declarada para cruzar"
          : "Solo superficie declarada — sin ARBA para cruzar",
      details: { declared, arba },
    };
  }

  if (arba <= 0) {
    return {
      id: "arba_coherence",
      value: 0,
      weight,
      confidence: 0,
      reason: `ARBA reporta ${arba}m² — dato inválido para cruzar`,
      details: { declared, arba },
    };
  }

  const diff = Math.abs(declared - arba) / arba;
  let value: number;
  if (diff <= 0.10) value = 100;
  else if (diff <= 0.25) value = 80;
  else if (diff <= 0.50) value = 50;
  else if (diff <= 1.00) value = 20;
  else value = 0;

  return {
    id: "arba_coherence",
    value,
    weight,
    confidence: 1.0,
    reason: `Declarada ${declared}m² vs ARBA ${arba}m² (diff ${(diff * 100).toFixed(1)}%)`,
    details: { declared, arba, diffPct: diff },
  };
}

// ---------------------------------------------------------------------------
// 4. Time on market — days tracked by us, with a price-drop bonus.
//
// Caveat: this is days-tracked-by-us, not days-truly-on-Zonaprop. It's a
// lower bound. Confidence ramps up in the first 30 days so a freshly-scraped
// listing doesn't get a fake-high score.
// ---------------------------------------------------------------------------

function computeDays(firstSeenAt: string | null, lastSeenAt: string | null, isActive: boolean): number | null {
  if (!firstSeenAt) return null;
  const start = new Date(firstSeenAt).getTime();
  if (!Number.isFinite(start)) return null;
  const end =
    isActive === false && lastSeenAt
      ? new Date(lastSeenAt).getTime()
      : Date.now();
  const days = Math.floor((end - start) / (24 * 60 * 60 * 1000));
  return Math.max(0, days);
}

export function timeOnMarketSubScore(input: ScoringInput): SubScore {
  const { first_seen_at, last_seen_at, is_active } = input.property;
  const weight = SUBSCORE_WEIGHTS.time_on_market;
  const days = computeDays(first_seen_at, last_seen_at, is_active);

  if (days === null) {
    return {
      id: "time_on_market",
      value: 0,
      weight,
      confidence: 0,
      reason: "Sin first_seen_at — no se puede evaluar",
    };
  }

  // Curve: 100 at ≤30 days, linear to 0 at 180+.
  let value: number;
  if (days <= 30) value = 100;
  else if (days >= 180) value = 0;
  else value = Math.round(100 * (1 - (days - 30) / 150));

  // Bonus: a recent price drop signals the seller is engaged, not stuck.
  const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;
  const recentDrops = input.history.filter((h) => {
    if (h.field_changed !== "price_amount") return false;
    const t = new Date(h.changed_at).getTime();
    if (!Number.isFinite(t) || t < sixtyDaysAgo) return false;
    const oldV = parseFloat(h.old_value ?? "");
    const newV = parseFloat(h.new_value ?? "");
    return Number.isFinite(oldV) && Number.isFinite(newV) && newV < oldV;
  });
  const bonus = recentDrops.length > 0 ? 10 : 0;
  value = Math.max(0, Math.min(100, value + bonus));

  // Confidence ramp: 0.3 first 14 days → 1.0 at day 30+.
  let confidence: number;
  if (days < 14) confidence = 0.3;
  else if (days >= 30) confidence = 1.0;
  else confidence = 0.3 + ((days - 14) / 16) * 0.7;
  confidence = Math.round(confidence * 100) / 100;

  const parts: string[] = [`${days} días tracked`];
  if (bonus > 0) parts.push(`price-drop reciente (+${bonus})`);
  if (days < 14) parts.push("temprano para juzgar");

  return {
    id: "time_on_market",
    value,
    weight,
    confidence,
    reason: parts.join(" · "),
    details: { days, bonus, recentDropsCount: recentDrops.length },
  };
}

// ---------------------------------------------------------------------------
// 5. Price vs comparables — USD price/m² vs median for the same (partido, type).
//
// Piecewise linear: 100 at -25% (cheap), 50 at 0% (matches median), 0 at +50%
// (expensive). Skipped silently when sample size <5, ARS-only, or surface
// missing — we'd rather not score than guess.
// ---------------------------------------------------------------------------

export function priceVsComparablesSubScore(input: ScoringInput): SubScore {
  const { price_amount, price_currency, property_type, partido } = input.property;
  const surface = input.property.surface_arba ?? input.property.surface_total ?? null;
  const weight = SUBSCORE_WEIGHTS.price_vs_comparables;

  if (!price_amount || !price_currency || !property_type || !partido || !surface || surface <= 0) {
    return {
      id: "price_vs_comparables",
      value: 0,
      weight,
      confidence: 0,
      reason: "Faltan datos para comparar (precio, superficie, tipo o partido)",
    };
  }

  if (price_currency !== "USD") {
    return {
      id: "price_vs_comparables",
      value: 0,
      weight,
      confidence: 0,
      reason: `Precio en ${price_currency} — comparables solo en USD por ahora`,
    };
  }

  const { medianPricePerM2Usd, sampleSize } = input.comparableStats;
  if (medianPricePerM2Usd === null || sampleSize < 5) {
    return {
      id: "price_vs_comparables",
      value: 0,
      weight,
      confidence: 0,
      reason: `Muestra insuficiente (n=${sampleSize} en ${partido} · ${property_type}, se requieren ≥5)`,
    };
  }

  const ppm2 = price_amount / surface;
  const diff = (ppm2 - medianPricePerM2Usd) / medianPricePerM2Usd;

  // Piecewise linear, anchored at: -25%→100, -10%→75, 0%→50, +25%→25, +50%→0.
  let value: number;
  if (diff <= -0.25) value = 100;
  else if (diff <= -0.10) value = 75 + ((-0.10 - diff) / 0.15) * 25;
  else if (diff <= 0.00) value = 50 + (-diff / 0.10) * 25;
  else if (diff <= 0.25) value = 50 - (diff / 0.25) * 25;
  else if (diff <= 0.50) value = 25 - ((diff - 0.25) / 0.25) * 25;
  else value = 0;
  value = Math.max(0, Math.min(100, Math.round(value)));

  const confidence = sampleSize >= 10 ? 1.0 : 0.5;
  const above = diff > 0;
  const pct = `${Math.abs(diff * 100).toFixed(0)}%`;
  const reason = `USD ${ppm2.toFixed(0)}/m² ${above ? "sobre" : "bajo"} mediana ${medianPricePerM2Usd.toFixed(0)}/m² (${pct}, n=${sampleSize})`;

  return {
    id: "price_vs_comparables",
    value,
    weight,
    confidence,
    reason,
    details: { pricePerM2: ppm2, median: medianPricePerM2Usd, diffPct: diff, sampleSize },
  };
}
