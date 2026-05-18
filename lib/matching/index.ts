export { computeMatchScore } from "./match";
export { getMatchBand, interpolateMatchRingColor, listMatchBands } from "./bands";
export type { MatchBand, MatchBandId } from "./bands";
export {
  KNOWN_MUST_HAVES,
  countMustHavesFulfilled,
  normalizeForMatching,
  normalizeTag,
  propertySatisfiesMustHave,
} from "./must-haves";
export type { KnownMustHave } from "./must-haves";
export type {
  MatchBreakdown,
  MatchSubScore,
  MatchSubScoreBody,
  MatchSubScoreId,
  PropertyForMatching,
  SearchProfileForMatching,
  ZonePref,
  ZonePriority,
} from "./types";
export {
  MATCH_ALGORITHM_VERSION,
  MATCH_MIN_EFFECTIVE_WEIGHT_RATIO,
  MATCH_SUBSCORE_WEIGHTS,
} from "./types";
