import { getAdminClient } from "./client";
import { ComparablesCache, getComparableStats } from "./comparables";
import {
  arbaCoherenceSubScore,
  documentationSubScore,
  listingQualitySubScore,
  priceVsComparablesSubScore,
  timeOnMarketSubScore,
} from "./subscores";
import {
  ALGORITHM_VERSION,
  MIN_EFFECTIVE_WEIGHT_RATIO,
  type ArbaLookupForScoring,
  type HistoryEvent,
  type PropertyForScoring,
  type QualityBreakdown,
  type ScoringInput,
  type SubScore,
  type SubScoreBody,
  type SubScoreId,
} from "./types";

/**
 * Top-level quality scoring orchestrator.
 *
 *   computeQualityScore(input)  → pure aggregation, no I/O. Easy to test.
 *   gatherScoringInputs(id)     → I/O. Reads property + ARBA lookup + history
 *                                 + comparables in one batch.
 *   recomputeQualityScore(id)   → gather → compute → persist.
 *
 * Renormalization: the total is a weighted average over sub-scores that
 * actually had data (confidence > 0). The `effective_weight_ratio` field
 * reports what fraction of nominal weight was actually evaluated. Below
 * MIN_EFFECTIVE_WEIGHT_RATIO we mark the score as `insufficient_data` and
 * persist null — we'd rather show "not enough data" than a plausible-but-
 * meaningless number.
 */

// ---------------------------------------------------------------------------
// Pure aggregation
// ---------------------------------------------------------------------------

export function computeQualityScore(input: ScoringInput): QualityBreakdown {
  const subs: SubScore[] = [
    listingQualitySubScore(input),
    documentationSubScore(input),
    arbaCoherenceSubScore(input),
    timeOnMarketSubScore(input),
    priceVsComparablesSubScore(input),
  ];

  const nominalWeight = subs.reduce((acc, s) => acc + s.weight, 0);
  const effectiveWeight = subs.reduce((acc, s) => acc + s.weight * s.confidence, 0);
  const ratio = nominalWeight === 0 ? 0 : effectiveWeight / nominalWeight;
  const insufficient = ratio < MIN_EFFECTIVE_WEIGHT_RATIO;

  let score: number | null;
  if (effectiveWeight === 0 || insufficient) {
    score = null;
  } else {
    const weighted = subs.reduce((acc, s) => acc + s.value * s.weight * s.confidence, 0);
    score = Math.round(weighted / effectiveWeight);
  }

  const subscores = {} as Record<SubScoreId, SubScoreBody>;
  for (const s of subs) {
    const { id, ...rest } = s;
    subscores[id] = rest;
  }

  return {
    score,
    computed_at: new Date().toISOString(),
    algorithm_version: ALGORITHM_VERSION,
    effective_weight_ratio: Math.round(ratio * 1000) / 1000,
    insufficient_data: insufficient,
    subscores,
  };
}

// ---------------------------------------------------------------------------
// I/O — gather inputs
// ---------------------------------------------------------------------------

const PROPERTY_COLS = [
  "id",
  "source",
  "property_type",
  "partido",
  "partida",
  "nomenclatura_catastral",
  "address",
  "lat",
  "lng",
  "price_amount",
  "price_currency",
  "surface_total",
  "surface_covered",
  "surface_arba",
  "rooms",
  "bedrooms",
  "bathrooms",
  "garages",
  "description",
  "photos",
  "first_seen_at",
  "last_seen_at",
  "is_active",
].join(", ");

interface RawPropertyRow {
  id: string;
  source: string;
  property_type: string | null;
  partido: string | null;
  partida: string | null;
  nomenclatura_catastral: string | null;
  address: string | null;
  lat: number | string | null;
  lng: number | string | null;
  price_amount: number | string | null;
  price_currency: "USD" | "ARS" | null;
  surface_total: number | string | null;
  surface_covered: number | string | null;
  surface_arba: number | string | null;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  garages: number | null;
  description: string | null;
  photos: unknown;
  first_seen_at: string | null;
  last_seen_at: string | null;
  is_active: boolean;
}

function toNumber(v: number | string | null): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeProperty(row: RawPropertyRow): PropertyForScoring {
  const photos = Array.isArray(row.photos)
    ? (row.photos as unknown[]).filter((p): p is string => typeof p === "string")
    : [];
  return {
    id: row.id,
    source: row.source,
    property_type: row.property_type,
    partido: row.partido,
    partida: row.partida,
    nomenclatura_catastral: row.nomenclatura_catastral,
    address: row.address,
    lat: toNumber(row.lat),
    lng: toNumber(row.lng),
    price_amount: toNumber(row.price_amount),
    price_currency: row.price_currency,
    surface_total: toNumber(row.surface_total),
    surface_covered: toNumber(row.surface_covered),
    surface_arba: toNumber(row.surface_arba),
    rooms: row.rooms,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    garages: row.garages,
    description: row.description,
    photos,
    first_seen_at: row.first_seen_at,
    last_seen_at: row.last_seen_at,
    is_active: row.is_active,
  };
}

export async function gatherScoringInputs(
  propertyId: string,
  comparables?: ComparablesCache,
): Promise<ScoringInput> {
  const supabase = getAdminClient();

  const { data: rawProperty, error: propErr } = await supabase
    .from("properties")
    .select(PROPERTY_COLS)
    .eq("id", propertyId)
    .maybeSingle();
  if (propErr) throw propErr;
  if (!rawProperty) throw new Error(`Property not found: ${propertyId}`);
  const property = normalizeProperty(rawProperty as unknown as RawPropertyRow);

  let arbaLookup: ArbaLookupForScoring | null = null;
  if (property.lat !== null && property.lng !== null) {
    const { data: arba, error: arbaErr } = await supabase
      .from("arba_lookups")
      .select("match_strategy")
      .eq("lat", property.lat)
      .eq("lng", property.lng)
      .maybeSingle();
    if (arbaErr) throw arbaErr;
    if (arba) {
      const row = arba as unknown as { match_strategy: "intersects" | "dwithin" | "none" };
      arbaLookup = { matchStrategy: row.match_strategy };
    }
  }

  const { data: historyRows, error: histErr } = await supabase
    .from("property_history")
    .select("changed_at, field_changed, old_value, new_value")
    .eq("property_id", propertyId)
    .order("changed_at", { ascending: false })
    .limit(100);
  if (histErr) throw histErr;
  const history = (historyRows ?? []) as unknown as HistoryEvent[];

  const comparableStats = comparables
    ? comparables.get(property.partido, property.property_type)
    : await getComparableStats(property.partido, property.property_type);

  return { property, arbaLookup, history, comparableStats };
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

export async function recomputeQualityScore(
  propertyId: string,
  comparables?: ComparablesCache,
): Promise<QualityBreakdown> {
  const input = await gatherScoringInputs(propertyId, comparables);
  const breakdown = computeQualityScore(input);

  const supabase = getAdminClient();
  const { error } = await supabase
    .from("properties")
    .update({
      quality_score: breakdown.score,
      quality_score_breakdown: breakdown,
    } as never)
    .eq("id", propertyId);
  if (error) throw error;

  return breakdown;
}
