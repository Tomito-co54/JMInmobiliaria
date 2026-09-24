"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Reveal } from "@/components/shared/Reveal";
import { buildingKey, type BuildingSummary } from "@/lib/buildings";
import { useMatchPreferences } from "@/hooks/use-match-preferences";
import { hasAnyPreference, type MatchPreferences } from "@/lib/matching/preferences";
import {
  EMPTY_CATALOG_FILTERS,
  applyFilters,
  catalogOptions,
  dropStaleAnswers,
  filtersFromParams,
  filtersToParams,
  narrowedOptions,
  orderByMatch,
  ownFirst,
  sortCatalog,
  sortFromParams,
  sortToParams,
  type CatalogFilters as Filters,
  type CatalogProperty,
  type CatalogSort,
} from "@/lib/catalog/filters";
import { CatalogFilters } from "./CatalogFilters";
import { CatalogIntro, describeSearch } from "./CatalogIntro";
import { CatalogMap } from "./CatalogMap";
import { CatalogSearchBoard } from "./CatalogSearchBoard";
import { PropertyPremiumCard } from "./PropertyPremiumCard";

const MAP_PARAM = "mapa";
/**
 * Marks a catalog the visitor asked to see whole. Without it an unfiltered
 * catalog and "nobody has searched yet" are the same URL, and the back button
 * from a listing would land on the three questions again.
 */
const ALL_PARAM = "ver";
/** The last search of the visit, offered back by the intro. */
const LAST_SEARCH_KEY = "jm.catalog-search.v1";
/**
 * Cards drawn at once; more arrive as the visitor nears the end. With a
 * partner's catalog in, the list went from 15 cards to 128 (24-sep-2026), and
 * drawing all of them on every search is what a phone feels between the tap
 * and the page. The order is decided over the whole list first — the best
 * match is card 1 whether or not card 100 exists yet — only the drawing waits.
 */
const PAGE_SIZE = 24;

function readLastSearch(): Filters | null {
  try {
    const raw = window.sessionStorage.getItem(LAST_SEARCH_KEY);
    if (!raw) return null;
    return filtersFromParams(new URLSearchParams(raw));
  } catch {
    return null;
  }
}

function saveLastSearch(f: Filters) {
  try {
    if (f.operations.length > 0 || f.types.length > 0 || f.localidades.length > 0) {
      window.sessionStorage.setItem(LAST_SEARCH_KEY, filtersToParams(f).toString());
    }
  } catch {
    /* storage refused: the intro just will not offer to resume */
  }
}

/**
 * The catalog, in the browser: the three-question intro, then the results
 * with the search board beside them, filtered and ordered.
 *
 * Client-side because the match has to be — the preferences live in
 * `sessionStorage` and never reach the server — and once the order is
 * decided here, the filters may as well be too: the page ships the whole
 * published list regardless.
 *
 * The intro opens when the page is reached with no query string at all, which
 * the server decides (`startWithIntro`) so the first paint is already the
 * right one. Any search, or "ver todas", writes the URL, so a shared link and
 * the back button land on results.
 *
 * The filters are mirrored into the query string with
 * `history.replaceState`, which Next's router picks up without a round trip.
 * They are read back from `window.location` after mount rather than through
 * `useSearchParams`: that hook needs a Suspense boundary, and in the dev
 * server the boundary it created never hydrated — the bar rendered and no
 * chip answered a tap. The match order is NOT in the URL: it is a property
 * of the visitor, not of the page. A chosen order (price, age) is.
 */
export function PropertyCatalogList({
  properties,
  buildings,
  startWithIntro,
  eyebrow,
  heading,
  intro,
}: {
  properties: CatalogProperty[];
  /** Keyed by parcel; a plain object because it crosses to the client. */
  buildings: Record<string, BuildingSummary>;
  startWithIntro: boolean;
  eyebrow: string;
  heading: string;
  intro: string;
}) {
  const [introOpen, setIntroOpen] = useState(startWithIntro);
  const [filters, setFilters] = useState<Filters>(EMPTY_CATALOG_FILTERS);
  const [sort, setSort] = useState<CatalogSort | null>(null);
  // `?mapa=1` opens the map. It travels with the filters so a link from the
  // landing, or a shared one, lands with the map already open.
  const [mapOpen, setMapOpen] = useState(false);
  const [lastSearch, setLastSearch] = useState<Filters | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFilters(filtersFromParams(params));
    setSort(sortFromParams(params));
    setMapOpen(params.get(MAP_PARAM) === "1");
    setLastSearch(readLastSearch());
  }, []);
  const { preferences, setPreferences, ready } = useMatchPreferences();

  const writeUrl = useCallback((next: Filters, open: boolean, order: CatalogSort | null) => {
    const params = filtersToParams(next);
    sortToParams(order, params);
    if (open) params.set(MAP_PARAM, "1");
    if (params.toString() === "") params.set(ALL_PARAM, "todas");
    window.history.replaceState(null, "", `?${params.toString()}`);
    saveLastSearch(next);
  }, []);

  /**
   * Operation and type are both a filter here and a question of the match,
   * and the two must not disagree: the header's "tu mejor match" and each
   * card's score read the match. So the filter is copied into it. The match
   * holds one operation, and it is a gate: with both picked it stays open
   * (null), or it would sink one of the two the visitor asked for. A change of
   * operation also drops the budget, which was a ceiling in the other
   * currency (lib/matching/preferences, priceScaleFor).
   */
  const mirrorIntoMatch = useCallback(
    (next: Filters) => {
      const operation = next.operations.length === 1 ? next.operations[0] : null;
      const types = next.types;
      const sameTypes =
        types.length === preferences.propertyTypes.length &&
        types.every((t) => preferences.propertyTypes.includes(t));
      if (operation === preferences.operation && sameTypes) return;
      setPreferences({
        ...preferences,
        operation,
        propertyTypes: types,
        priceMax: operation === preferences.operation ? preferences.priceMax : null,
      });
    },
    [preferences, setPreferences],
  );

  const update = useCallback(
    (next: Filters) => {
      setFilters(next);
      writeUrl(next, mapOpen, sort);
      mirrorIntoMatch(next);
    },
    [mapOpen, sort, writeUrl, mirrorIntoMatch],
  );
  const changeSort = useCallback(
    (next: CatalogSort | null) => {
      setSort(next);
      writeUrl(filters, mapOpen, next);
    },
    [filters, mapOpen, writeUrl],
  );
  const toggleMap = useCallback(() => {
    const open = !mapOpen;
    setMapOpen(open);
    // Closing the map takes its area with it: an invisible rectangle would
    // keep narrowing a list with nothing on screen to explain why.
    const next = open ? filters : { ...filters, area: null };
    setFilters(next);
    writeUrl(next, open, sort);
  }, [filters, mapOpen, sort, writeUrl]);

  const finishIntro = useCallback(
    (answers: Pick<Filters, "operations" | "types" | "localidades">) => {
      const next = { ...EMPTY_CATALOG_FILTERS, ...answers };
      setIntroOpen(false);
      update(next);
      setLastSearch(next);
      document.getElementById("catalogo")?.scrollIntoView({ block: "start" });
    },
    [update],
  );

  // The board's chips are narrowed answer by answer, like the intro's, so
  // none of them leads to an empty list.
  const options = useMemo(
    () => ({ ...catalogOptions(properties), ...narrowedOptions(properties, filters) }),
    [properties, filters],
  );
  const filtered = useMemo(() => ownFirst(applyFilters(properties, filters)), [properties, filters]);
  const byMatch = ready && hasAnyPreference(preferences);
  const order = useCallback(
    (list: CatalogProperty[]) =>
      sortCatalog(
        byMatch ? orderByMatch(list, preferences) : list.map((property) => ({ property, score: null })),
        sort,
      ),
    [byMatch, preferences, sort],
  );
  const ordered = useMemo(() => order(filtered), [order, filtered]);
  // The map shows everything the OTHER filters keep, so the visitor can see
  // what an area leaves out; the area itself only dims, it does not remove.
  const mapItems = useMemo(
    () => (mapOpen ? order(ownFirst(applyFilters(properties, { ...filters, area: null }))) : []),
    [mapOpen, order, properties, filters],
  );

  // A new search, order or match starts again from the top of the list.
  const [shown, setShown] = useState(PAGE_SIZE);
  useEffect(() => setShown(PAGE_SIZE), [ordered]);
  const more = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = more.current;
    if (!el) return;
    // Well before the end, so the next cards are there when the scroll is.
    // Observing again after every batch re-fires while the marker is still in
    // range, which fills a tall screen without waiting for a scroll.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setShown((n) => n + PAGE_SIZE);
      },
      { rootMargin: "1200px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
    // introOpen: behind the intro the marker does not exist yet.
  }, [shown, ordered.length, introOpen]);

  // A pin on the map can name a card that is not drawn yet: draw up to it,
  // then scroll once it exists.
  const pendingScroll = useRef<string | null>(null);
  useEffect(() => {
    const id = pendingScroll.current;
    if (!id) return;
    pendingScroll.current = null;
    document.getElementById(`prop-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [shown]);
  const scrollToCard = useCallback(
    (id: string) => {
      const index = ordered.findIndex((item) => item.property.id === id);
      if (index >= shown) {
        pendingScroll.current = id;
        setShown(Math.ceil((index + 1) / PAGE_SIZE) * PAGE_SIZE);
        return;
      }
      document.getElementById(`prop-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    [ordered, shown],
  );

  if (introOpen) {
    const resumeLabel = lastSearch ? describeSearch(lastSearch) : null;
    return (
      <CatalogIntro
        properties={properties}
        resume={lastSearch && resumeLabel ? { label: resumeLabel, filters: lastSearch } : null}
        onDone={finishIntro}
        onSkip={() => {
          setIntroOpen(false);
          update(EMPTY_CATALOG_FILTERS);
        }}
      />
    );
  }

  const searchLabel = describeSearch(filters);

  return (
    <div className="space-y-8 sm:space-y-10">
      <Reveal className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.2em] font-medium" style={{ color: "var(--brand-gold)" }}>
          {eyebrow}
        </p>
        <h2
          className="mt-3 font-heading font-medium text-3xl sm:text-4xl tracking-tight"
          style={{ color: "var(--brand-heading)" }}
        >
          {searchLabel ?? heading}
        </h2>
        <p className="mt-3 text-sm sm:text-base text-muted-foreground" aria-live="polite">
          {/* The count follows the search: "15 publicadas" over a list of 14
              would be the heading disagreeing with the page under it. */}
          {filtered.length === properties.length
            ? intro
            : `${filtered.length} ${filtered.length === 1 ? "propiedad coincide" : "propiedades coinciden"} con tu búsqueda.`}
        </p>
      </Reveal>

      {/* A column on a phone (board folded above the list), two on a wide
          screen (list, then the board following the scroll). */}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-10">
        <CatalogSearchBoard
          className="lg:sticky lg:top-6 lg:order-last lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto"
          filters={filters}
          options={options}
          onFiltersChange={(next) => update(dropStaleAnswers(properties, next))}
          preferences={preferences}
          onPreferencesChange={(next: MatchPreferences) => setPreferences(next)}
          onRestart={() => setIntroOpen(true)}
        />

        <div className="min-w-0 space-y-8 sm:space-y-10">
          <CatalogFilters
            filters={filters}
            onChange={update}
            sort={sort}
            onSortChange={changeSort}
            byMatch={byMatch}
            shown={filtered.length}
            total={properties.length}
            mapOpen={mapOpen}
            onToggleMap={toggleMap}
          />

          {mapOpen && (
            <CatalogMap
              items={mapItems}
              selection={filters.area}
              onSelectionChange={(area) => update({ ...filters, area })}
              onPointClick={scrollToCard}
            />
          )}

          {byMatch && sort === null && ordered.length > 0 && (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              Ordenadas por <span className="font-medium text-foreground">tu match</span>: las que mejor
              encajan con lo que buscás van primero.
            </p>
          )}

          {ordered.length === 0 ? (
            <div className="rounded-3xl border bg-card p-8 text-center text-sm text-muted-foreground">
              Ninguna propiedad coincide con esa búsqueda.{" "}
              <button
                type="button"
                onClick={() => update(EMPTY_CATALOG_FILTERS)}
                className="font-medium text-foreground underline underline-offset-4"
              >
                Ver todas
              </button>
            </div>
          ) : (
            <div className="space-y-8 sm:space-y-12">
              {ordered.slice(0, shown).map(({ property, score }, i) => {
                const flip = i % 2 === 1;
                return (
                  // Each card swings in from its photo side (flip → from the
                  // right, else from the left) with a small per-card stagger,
                  // so scrolling the catalog has rhythm instead of a flat fade
                  // (§2.4). Keyed by id, so reordering moves cards rather than
                  // repainting them.
                  <Reveal
                    key={property.id}
                    id={`prop-${property.id}`}
                    delayMs={60}
                    direction={flip ? "right" : "left"}
                  >
                    <PropertyPremiumCard
                      property={property}
                      flip={flip}
                      building={buildings[buildingKey(property) ?? ""]}
                      matchScore={score}
                    />
                  </Reveal>
                );
              })}
              {shown < ordered.length && (
                // The marker the observer watches, and a button for when it
                // cannot: a browser without it, or a visitor who would rather
                // ask than scroll.
                <div ref={more} className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShown((n) => n + PAGE_SIZE)}
                    className="inline-flex min-h-11 items-center rounded-full border px-5 text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    Ver más propiedades ({ordered.length - shown} más)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
