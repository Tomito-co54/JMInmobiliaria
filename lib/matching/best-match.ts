import { computeMatchScore } from "./match";
import { hasAnyPreference, toSearchProfile } from "./preferences";
import type { MatchPreferences } from "./preferences";
import type { MatchableProperty } from "./types";

export interface BestMatch {
  property: MatchableProperty;
  score: number;
}

/**
 * The visitor's best match in a catalog, or null when there is nothing to
 * say yet.
 *
 * Null covers three genuinely different situations that all deserve the same
 * answer — an empty catalog, a visitor who has expressed nothing, and a
 * catalog where no listing could be scored at all. In each of them the honest
 * display is the neutral prompt, not a number.
 *
 * Answering nothing is deliberately not treated as "matches everything": the
 * sub-scores renormalize over what was actually expressed, so a match built
 * on zero criteria would be a number about nothing, shown in the one place a
 * visitor is most likely to read it as a recommendation.
 *
 * Pure and linear over a catalog that is four rows today and would still be
 * cheap at four hundred, which is why it runs in the browser on every tap
 * instead of round-tripping.
 */
export function bestMatch(
  properties: MatchableProperty[],
  preferences: MatchPreferences,
): BestMatch | null {
  if (properties.length === 0) return null;
  if (!hasAnyPreference(preferences)) return null;

  const profile = toSearchProfile(preferences);
  let winner: BestMatch | null = null;
  for (const property of properties) {
    const { score } = computeMatchScore(property, profile);
    if (score === null) continue;
    if (!winner || score > winner.score) winner = { property, score };
  }
  return winner;
}
