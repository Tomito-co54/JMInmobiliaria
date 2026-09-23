"use client";

import { ArrowUpDown, Map as MapIcon, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  EMPTY_CATALOG_FILTERS,
  hasAnyFilter,
  type CatalogFilters as Filters,
  type CatalogSort,
} from "@/lib/catalog/filters";

/**
 * The bar above the results: a search box, the map switch, and the order.
 *
 * Operation, type and place used to live here as chips. They moved to the
 * search board beside the list (CatalogSearchBoard), which is where the
 * intro's answers are shown and changed — two places to set the same filter
 * would be two answers to one question.
 */

const SORT_LABELS: Record<CatalogSort, string> = {
  "precio-asc": "Menor precio",
  "precio-desc": "Mayor precio",
  nuevas: "Más nuevas",
};

export function CatalogFilters({
  filters,
  onChange,
  sort,
  onSortChange,
  byMatch,
  shown,
  total,
  mapOpen,
  onToggleMap,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  /** Null is the default order: best match first, or the catalog's own. */
  sort: CatalogSort | null;
  onSortChange: (next: CatalogSort | null) => void;
  /** Whether the default order is the visitor's match. Names the option. */
  byMatch: boolean;
  /** How many listings survive the filters, and how many there are. */
  shown: number;
  total: number;
  /** Whether the map is open below the bar; the button here toggles it. */
  mapOpen: boolean;
  onToggleMap: () => void;
}) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const active = hasAnyFilter(filters);

  return (
    <div className="rounded-3xl border bg-card p-4 sm:p-5 space-y-4">
      <div className="flex gap-2">
        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">Buscar en el catálogo</span>
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
            placeholder="Buscar por dirección, zona o una palabra"
            autoComplete="off"
            className="h-11 w-full rounded-full border bg-background pl-11 pr-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        {/* The map is a filter too — an area — so its switch lives with the
            others, not in a tab of its own. */}
        <button
          type="button"
          aria-pressed={mapOpen}
          onClick={onToggleMap}
          className={cn(
            "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
            mapOpen
              ? "border-transparent bg-primary text-primary-foreground"
              : "bg-background text-foreground hover:border-primary/40",
          )}
        >
          <MapIcon className="size-4" aria-hidden />
          <span className="hidden sm:inline">{mapOpen ? "Ocultar mapa" : "Ver en mapa"}</span>
          <span className="sm:hidden">Mapa</span>
        </button>
      </div>


      <label className="flex items-center gap-2 text-sm">
        <ArrowUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="text-muted-foreground">Ordenar por</span>
        <select
          value={sort ?? ""}
          onChange={(e) => onSortChange((e.target.value || null) as CatalogSort | null)}
          className="h-11 min-w-0 flex-1 rounded-full border bg-background px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-none"
        >
          <option value="">{byMatch ? "Mejor match" : "Recomendadas"}</option>
          {(Object.keys(SORT_LABELS) as CatalogSort[]).map((k) => (
            <option key={k} value={k}>
              {SORT_LABELS[k]}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <p aria-live="polite">
          {active
            ? shown === total
              ? `Las ${total} propiedades coinciden`
              : `${shown} de ${total} ${total === 1 ? "propiedad" : "propiedades"}`
            : `${total} ${total === 1 ? "propiedad" : "propiedades"}`}
          {filters.area && " · dentro del área del mapa"}
        </p>
        {active && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_CATALOG_FILTERS)}
            className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 font-medium text-foreground hover:bg-muted"
          >
            <X className="size-4" aria-hidden />
            Limpiar
          </button>
        )}
      </div>
    </div>
  );
}
