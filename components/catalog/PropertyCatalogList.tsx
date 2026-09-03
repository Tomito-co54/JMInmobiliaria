"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Reveal } from "@/components/shared/Reveal";
import { buildingKey, type BuildingSummary } from "@/lib/buildings";
import { useMatchPreferences } from "@/hooks/use-match-preferences";
import { hasAnyPreference } from "@/lib/matching/preferences";
import {
  EMPTY_CATALOG_FILTERS,
  applyFilters,
  catalogOptions,
  filtersFromParams,
  filtersToParams,
  orderByMatch,
  type CatalogFilters as Filters,
  type CatalogProperty,
} from "@/lib/catalog/filters";
import { CatalogFilters } from "./CatalogFilters";
import { PropertyPremiumCard } from "./PropertyPremiumCard";

/**
 * The catalog's list, in the browser: filtered by the bar above it and
 * ordered by the visitor's match when they have one.
 *
 * Client-side because the match has to be — the preferences live in
 * `sessionStorage` and never reach the server — and once the order is
 * decided here, the filters may as well be too: the page ships the whole
 * published list regardless.
 *
 * The filters are mirrored into the query string with
 * `history.replaceState`, which Next's router picks up without a round trip,
 * so a filtered catalog can be sent to someone and survives the back button.
 * They are read back from `window.location` after mount rather than through
 * `useSearchParams`: that hook needs a Suspense boundary, and in the dev
 * server the boundary it created never hydrated — the bar rendered and no
 * chip answered a tap. The match order is NOT in the URL: it is a property
 * of the visitor, not of the page.
 *
 * Server and first client render agree because both start unfiltered and
 * the preferences hook reports `ready: false` until it has read storage;
 * URL filters and the match order arrive together after mount.
 */
export function PropertyCatalogList({
  properties,
  buildings,
}: {
  properties: CatalogProperty[];
  /** Keyed by parcel; a plain object because it crosses to the client. */
  buildings: Record<string, BuildingSummary>;
}) {
  const [filters, setFilters] = useState<Filters>(EMPTY_CATALOG_FILTERS);
  useEffect(() => {
    setFilters(filtersFromParams(new URLSearchParams(window.location.search)));
  }, []);
  const { preferences, ready } = useMatchPreferences();

  const update = useCallback((next: Filters) => {
    setFilters(next);
    const qs = filtersToParams(next).toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, []);

  const options = useMemo(() => catalogOptions(properties), [properties]);
  const filtered = useMemo(() => applyFilters(properties, filters), [properties, filters]);
  const byMatch = ready && hasAnyPreference(preferences);
  const ordered = useMemo(
    () => (byMatch ? orderByMatch(filtered, preferences) : filtered.map((property) => ({ property, score: null }))),
    [byMatch, filtered, preferences],
  );

  return (
    <div className="space-y-8 sm:space-y-10">
      <CatalogFilters
        filters={filters}
        options={options}
        onChange={update}
        shown={filtered.length}
        total={properties.length}
      />

      {byMatch && ordered.length > 0 && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Ordenadas por <span className="font-medium text-foreground">tu match</span>: las que mejor
          encajan con lo que buscás van primero.
        </p>
      )}

      {ordered.length === 0 ? (
        <div className="rounded-3xl border bg-card p-8 text-center text-sm text-muted-foreground">
          Ninguna propiedad coincide con esos filtros.{" "}
          <button
            type="button"
            onClick={() => update({ q: "", partido: null, operation: null, type: null })}
            className="font-medium text-foreground underline underline-offset-4"
          >
            Ver todas
          </button>
        </div>
      ) : (
        <div className="space-y-8 sm:space-y-12">
          {ordered.map(({ property, score }, i) => {
            const flip = i % 2 === 1;
            return (
              // Each card swings in from its photo side (flip → from the
              // right, else from the left) with a small per-card stagger,
              // so scrolling the catalog has rhythm instead of a flat fade
              // (§2.4). Keyed by id, so reordering by match moves cards
              // rather than repainting them.
              <Reveal key={property.id} delayMs={60} direction={flip ? "right" : "left"}>
                <PropertyPremiumCard
                  property={property}
                  flip={flip}
                  building={buildings[buildingKey(property) ?? ""]}
                  matchScore={score}
                />
              </Reveal>
            );
          })}
        </div>
      )}
    </div>
  );
}
