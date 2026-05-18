/**
 * Score band utilities — pure functions, no I/O.
 *
 * Two distinct concerns:
 *   1. Discrete bands (label + range) — what we *call* the score in text.
 *   2. Continuous ring color — what we *paint* in the ring (smooth gradient).
 *
 * The band thresholds and palette are owner-defined and locked here. Any
 * change goes through this file so the visual layer stays consistent
 * across admin and public surfaces.
 */

export type BandId =
  | "insufficient"
  | "low"
  | "improvable"
  | "acceptable"
  | "good"
  | "very_good"
  | "exceptional";

export interface ScoreBand {
  id: BandId;
  /** Spanish label shown next to the score number. */
  label: string;
  /** Hex of the band's representative color. */
  hex: string;
  /** CSS var name; lets components opt into theme tokens if they prefer. */
  cssVar: string;
  /** Inclusive integer range. */
  min: number;
  max: number;
}

/**
 * Discrete bands as agreed: 0-19 rojo, 20-35 naranja, 36-55 amarillo,
 * 56-75 lime, 76-94 verde, 95-100 dorado.
 *
 * Note: 95-100 is treated as a hard tier (the "trophy"). Lerp stops short
 * at the verde-to-dorado boundary so 94 still feels distinctly different
 * from 95+ visually as well.
 */
const BANDS: ScoreBand[] = [
  { id: "low",          label: "Insuficiente", hex: "#DC2626", cssVar: "--score-red",    min: 0,   max: 19  },
  { id: "improvable",   label: "Mejorable",    hex: "#F97316", cssVar: "--score-orange", min: 20,  max: 35  },
  { id: "acceptable",   label: "Aceptable",    hex: "#EAB308", cssVar: "--score-yellow", min: 36,  max: 55  },
  { id: "good",         label: "Bueno",        hex: "#84CC16", cssVar: "--score-lime",   min: 56,  max: 75  },
  { id: "very_good",    label: "Muy bueno",    hex: "#16A34A", cssVar: "--score-green",  min: 76,  max: 94  },
  { id: "exceptional",  label: "Excepcional",  hex: "#D4A24C", cssVar: "--score-gold",   min: 95,  max: 100 },
];

const INSUFFICIENT: ScoreBand = {
  id: "insufficient",
  label: "Sin datos suficientes",
  hex: "#94A3B8",
  cssVar: "--muted-foreground",
  min: 0,
  max: 0,
};

export function getScoreBand(score: number | null | undefined): ScoreBand {
  if (score === null || score === undefined || !Number.isFinite(score)) {
    return INSUFFICIENT;
  }
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  for (const band of BANDS) {
    if (clamped >= band.min && clamped <= band.max) return band;
  }
  // Unreachable given the table covers 0-100, but defensively return low.
  return BANDS[0];
}

export function listScoreBands(): ScoreBand[] {
  return BANDS.slice();
}

// ---------------------------------------------------------------------------
// Continuous ring color
// ---------------------------------------------------------------------------

interface ColorStop {
  pos: number;
  rgb: [number, number, number];
}

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  const n = parseInt(m, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/**
 * Stops are anchored at the median of each pre-gold band. The continuous
 * lerp ranges over 0-94; 95+ is a hard step into the gold tier.
 */
const STOPS: ColorStop[] = [
  { pos: 10, rgb: hexToRgb("#DC2626") }, // rojo
  { pos: 28, rgb: hexToRgb("#F97316") }, // naranja
  { pos: 46, rgb: hexToRgb("#EAB308") }, // amarillo
  { pos: 66, rgb: hexToRgb("#84CC16") }, // lime
  { pos: 85, rgb: hexToRgb("#16A34A") }, // verde
];

const GOLD_RGB = hexToRgb("#D4A24C");
const INSUFFICIENT_HEX = "#94A3B8";

/**
 * Returns the ring color for a given score as a hex string.
 *
 *   - score null/undefined → muted gray (the "no data" tone).
 *   - score >= 95          → gold (hard step into the trophy tier).
 *   - 0..94                → linear interpolation between adjacent stops.
 */
export function interpolateRingColor(score: number | null | undefined): string {
  if (score === null || score === undefined || !Number.isFinite(score)) {
    return INSUFFICIENT_HEX;
  }
  const clamped = Math.max(0, Math.min(100, score));
  if (clamped >= 95) return rgbToHex(...GOLD_RGB);
  if (clamped <= STOPS[0].pos) return rgbToHex(...STOPS[0].rgb);
  if (clamped >= STOPS[STOPS.length - 1].pos) {
    return rgbToHex(...STOPS[STOPS.length - 1].rgb);
  }
  for (let i = 0; i < STOPS.length - 1; i++) {
    const a = STOPS[i];
    const b = STOPS[i + 1];
    if (clamped >= a.pos && clamped <= b.pos) {
      const t = (clamped - a.pos) / (b.pos - a.pos);
      const r = a.rgb[0] + (b.rgb[0] - a.rgb[0]) * t;
      const g = a.rgb[1] + (b.rgb[1] - a.rgb[1]) * t;
      const bl = a.rgb[2] + (b.rgb[2] - a.rgb[2]) * t;
      return rgbToHex(r, g, bl);
    }
  }
  return rgbToHex(...STOPS[STOPS.length - 1].rgb);
}
