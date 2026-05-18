/**
 * Match score band classification.
 *
 * Distinct from the quality score bands — the match is a 4-step scale
 * (No encaja / Encaja parcialmente / Buen match / Match perfecto), not
 * the 6-step gradient the quality score uses. The colors reuse the
 * quality score palette for visual consistency; the labels are
 * match-specific.
 */

import { interpolateRingColor as interpolateQualityColor } from "@/lib/scoring/bands";

export type MatchBandId = "no_fit" | "partial" | "good" | "perfect" | "insufficient";

export interface MatchBand {
  id: MatchBandId;
  label: string;
  hex: string;
  min: number;
  max: number;
}

const BANDS: MatchBand[] = [
  { id: "no_fit",   label: "No encaja",          hex: "#DC2626", min: 0,  max: 25  },
  { id: "partial",  label: "Encaja parcialmente", hex: "#EAB308", min: 26, max: 55  },
  { id: "good",     label: "Buen match",         hex: "#84CC16", min: 56, max: 80  },
  { id: "perfect",  label: "Match perfecto",     hex: "#16A34A", min: 81, max: 100 },
];

const INSUFFICIENT: MatchBand = {
  id: "insufficient",
  label: "Sin datos suficientes",
  hex: "#94A3B8",
  min: 0,
  max: 0,
};

export function getMatchBand(score: number | null | undefined): MatchBand {
  if (score === null || score === undefined || !Number.isFinite(score)) {
    return INSUFFICIENT;
  }
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  for (const band of BANDS) {
    if (clamped >= band.min && clamped <= band.max) return band;
  }
  return BANDS[0];
}

export function listMatchBands(): MatchBand[] {
  return BANDS.slice();
}

/**
 * Reuses the quality-score color interpolator so the visual rhythm of
 * the ring is consistent across both scores. Iterate independently if
 * the design later splits them.
 */
export const interpolateMatchRingColor = interpolateQualityColor;
