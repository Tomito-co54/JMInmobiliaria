"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MatchMeter } from "@/components/matching/MatchMeter";
import { MatchPreferencesForm } from "@/components/matching/MatchPreferencesForm";
import { useMatchPreferences } from "@/hooks/use-match-preferences";
import { hasAnyPreference, type MatchPreferences } from "@/lib/matching/preferences";
import { bestMatch, type MatchableProperty } from "@/lib/matching";
import { EMPTY_CATALOG_FILTERS, filtersToParams } from "@/lib/catalog/filters";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
          <p className="mt-3 text-sm text-foreground">
            <span className="font-medium">{best.property.address ?? "Una propiedad publicada"}</span>
            <span className="text-muted-foreground">
              {" "}
              · tu mejor match entre {properties.length}{" "}
              {properties.length === 1 ? "propiedad publicada" : "propiedades publicadas"}
            </span>
          </p>
          <MatchActions
            className="mt-4"
            properties={properties}
            preferences={preferences}
            bestId={best.property.id}
          />
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

      {/* The same way out, again at the end of the form: that is where the
          visitor is after the last answer, and with the meter scrolled away
          there was nothing there to press (Tomy, 24-sep-2026). */}
      <MatchActions
        properties={properties}
        preferences={ready ? preferences : null}
        bestId={showMeter && best ? best.property.id : null}
      />
    </div>
  );
}

/**
 * Where the match leads: the catalog with the answers applied, or straight to
 * the best one.
 *
 * Operation and type go in the URL, because the catalog filters by them
 * (lib/catalog/filters); the rest of the answers — zone, budget, rooms — do
 * not need to: the catalog reads the same sessionStorage and orders by the
 * match on arrival. With nothing to filter, `?ver=todas` so the catalog skips
 * its three-question intro: the visitor has just answered them here.
 */
function MatchActions({
  properties,
  preferences,
  bestId,
  className,
}: {
  properties: readonly MatchableProperty[];
  /** Null until the stored answers are read. */
  preferences: MatchPreferences | null;
  bestId: string | null;
  className?: string;
}) {
  const answered = preferences !== null && hasAnyPreference(preferences);
  const operations = preferences?.operation ? [preferences.operation] : [];
  const types = preferences?.propertyTypes ?? [];
  const params = filtersToParams({ ...EMPTY_CATALOG_FILTERS, operations, types });
  if (params.toString() === "") params.set("ver", "todas");
  // Counted the way the catalog will filter, so the button does not promise
  // more listings than the page it opens.
  const count = properties.filter(
    (p) =>
      (operations.length === 0 || operations.includes(p.operation_type as "venta" | "alquiler")) &&
      (types.length === 0 || (p.property_type !== null && types.includes(p.property_type))),
  ).length;
  const label = !answered
    ? "Ver todas las propiedades"
    : count === 1
      ? "Ver la propiedad, por tu match"
      : `Ver ${count} propiedades por tu match`;

  return (
    <div className={cn("flex flex-col gap-2.5 sm:flex-row", className)}>
      <Link
        href={`/propiedades?${params.toString()}`}
        // flex-1 only in the row: in the phone's column it sets flex-basis 0
        // on the vertical axis and the button collapsed to 21px (measured).
        // And it may wrap: at 375 the label fills the width to the pixel.
        className={cn(
          buttonVariants({ size: "lg" }),
          "h-auto min-h-12 gap-2 whitespace-normal px-5 py-2.5 text-center text-sm sm:flex-1 sm:text-base",
        )}
      >
        {label}
        <ArrowRight className="size-4" aria-hidden />
      </Link>
      {bestId && (
        <Link
          href={`/p/${bestId}`}
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 px-5 text-sm sm:text-base")}
        >
          Ir a tu mejor match
        </Link>
      )}
    </div>
  );
}
