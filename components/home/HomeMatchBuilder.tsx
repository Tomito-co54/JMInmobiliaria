"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MatchMeter } from "@/components/matching/MatchMeter";
import { MatchPreferencesForm } from "@/components/matching/MatchPreferencesForm";
import { useMatchPreferences } from "@/hooks/use-match-preferences";
import { hasAnyPreference } from "@/lib/matching/preferences";
import { bestMatch, type MatchableProperty } from "@/lib/matching";

/**
 * Where the visitor says what they are looking for — the home half of the
 * match, and the thing that makes the match on a listing page possible at all.
 *
 * It replaced a demo whose number was fabricated: three toggles carrying
 * hand-picked weights that summed to a believable meter. That is the same
 * class of thing as the invented parcel this page used to draw next to a
 * paragraph promising the real one (Fase 16). Here the meter runs the actual
 * matcher over the actual published catalog, so the number is the visitor's
 * best real match and the name under it is a property they can open.
 *
 * The answers persist for the visit (sessionStorage, see use-match-preferences)
 * so a listing page can pick them up without asking again. No account, no
 * server, nothing that outlives the tab.
 */
export type { MatchableProperty };

export function HomeMatchBuilder({
  properties,
  copy,
}: {
  properties: MatchableProperty[];
  /**
   * The section's heading and pitch, rendered between the meter and the
   * controls. It stays a server-rendered node passed in rather than markup
   * in here: the copy is the page's, it has to be in the HTML for SEO, and
   * this component is a client island.
   */
  copy?: React.ReactNode;
}) {
  const { preferences, setPreferences, ready } = useMatchPreferences();
  const answered = hasAnyPreference(preferences);

  // Shared with the header's quick filter (lib/matching/best-match), so the
  // two places a visitor can read "tu match" cannot disagree about it.
  const best = bestMatch(properties, preferences);

  // Until the first client read lands, show the neutral prompt rather than a
  // score computed from empty preferences.
  const showMeter = ready && answered;

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      {showMeter && best ? (
        <div>
          <MatchMeter score={best.score} />
          <Link
            href={`/p/${best.property.id}`}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            {best.property.address ?? "Ver la propiedad"}
            <ArrowRight className="size-4" />
          </Link>
          <p className="mt-1 text-xs text-muted-foreground">
            Tu mejor match entre {properties.length}{" "}
            {properties.length === 1 ? "propiedad publicada" : "propiedades publicadas"}
          </p>
        </div>
      ) : (
        <div>
          <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
            Tu match
          </p>
          <p className="mt-1 text-4xl font-extrabold tabular-nums leading-none text-muted-foreground/40">
            —
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Elegí algo y el match se calcula solo.
          </p>
        </div>
      )}

      {copy}

      <MatchPreferencesForm
        value={preferences}
        onChange={setPreferences}
        operations={properties.map((p) => p.operation_type)}
      />
    </div>
  );
}
