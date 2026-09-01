"use client";

import { useState } from "react";
import { ChevronRight, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MatchMeter } from "@/components/matching/MatchMeter";
import { MatchBreakdownSheet } from "@/components/matching/MatchBreakdownSheet";
import { MatchPreferencesForm } from "@/components/matching/MatchPreferencesForm";
import { useMatchPreferences } from "@/hooks/use-match-preferences";
import {
  hasAnyPreference,
  toSearchProfile,
} from "@/lib/matching/preferences";
import { computeMatchScore } from "@/lib/matching";
import type { PropertyForMatching } from "@/lib/matching";

/**
 * "¿Esta propiedad es para vos?" — the block that replaced the Quality Score
 * in the listing panel.
 *
 * The score it replaced answered a question the visitor had not asked: how
 * good is this listing, on a scale every listing shares. The match answers
 * theirs. The score has not disappeared from the site — it still ranks the
 * catalog and drives the admin — it just stopped being the first thing a
 * buyer reads about a property they are already looking at.
 *
 * Everything here runs in the browser. `computeMatchScore` is pure, the
 * preferences live in `sessionStorage`, and no answer leaves the device —
 * which is what makes a match possible at all for a visitor with no account,
 * on a site with no public registration.
 */
export function PropertyMatchPanel({
  property,
}: {
  property: PropertyForMatching;
}) {
  const { preferences, setPreferences, ready } = useMatchPreferences();
  const [editing, setEditing] = useState(false);

  const answered = hasAnyPreference(preferences);
  const breakdown = answered
    ? computeMatchScore(property, toSearchProfile(preferences))
    : null;

  // Before the first client read, render the same thing the server did rather
  // than the empty-state pitch, which would flash for anyone arriving with
  // preferences already set.
  if (!ready) {
    return <div className="h-28" aria-hidden />;
  }

  if (!answered && !editing) {
    return (
      <div className="space-y-3">
        <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
          Tu match
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Decinos qué buscás y te decimos cuánto encaja esta propiedad —
          criterio por criterio, sin cuenta y sin dejar tus datos.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-between"
          onClick={() => setEditing(true)}
        >
          <span>Calcular mi match</span>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {breakdown && (
        <MatchMeter
          score={breakdown.score}
          caption={
            breakdown.insufficient_data
              ? "Contanos algo más para que el match signifique algo."
              : undefined
          }
        />
      )}

      {editing ? (
        <div className="space-y-4 rounded-xl border bg-card/50 p-4">
          <MatchPreferencesForm
            value={preferences}
            onChange={setPreferences}
          />
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setEditing(false)}
          >
            Listo
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="justify-center"
            onClick={() => setEditing(true)}
          >
            <SlidersHorizontal className="size-4" />
            Ajustar
          </Button>
          {breakdown && (
            <MatchBreakdownSheet
              breakdown={breakdown}
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-center w-full"
                >
                  Ver por qué
                </Button>
              }
            />
          )}
        </div>
      )}
    </div>
  );
}
