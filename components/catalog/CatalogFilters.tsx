"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { propertyTypeLabel } from "@/lib/property/types";
import {
  hasAnyFilter,
  type CatalogFilters as Filters,
  type CatalogOperation,
  type CatalogOptions,
} from "@/lib/catalog/filters";

/**
 * The catalog's filter bar: a search box and three selectors — zone, buy or
 * rent, type.
 *
 * Each selector is drawn only when the catalog gives it more than one
 * position; a control with a single answer is not a question (the rule the
 * match form already follows for "Comprar / Alquilar"). The options come
 * from the catalog itself, so the bar cannot offer a zone with nothing in it.
 *
 * Chips rather than dropdowns for the short lists: the same 44px pills the
 * match form uses, so the two ways of narrowing the catalog look like one
 * vocabulary (§2.5). Tapping the active chip clears it. Zone falls back to a
 * <select> once it has more partidos than fit a row on a phone.
 */
export function CatalogFilters({
  filters,
  options,
  onChange,
  shown,
  total,
}: {
  filters: Filters;
  options: CatalogOptions;
  onChange: (next: Filters) => void;
  /** How many listings survive the filters, and how many there are. */
  shown: number;
  total: number;
}) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const active = hasAnyFilter(filters);
  const showOperation = options.operations.length > 1;
  const showType = options.types.length > 1;
  const showPartido = options.partidos.length > 1;

  return (
    <div className="rounded-3xl border bg-card p-4 sm:p-5 space-y-4">
      <label className="relative block">
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

      {(showOperation || showType || showPartido) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-8">
          {showOperation && (
            <Group label="Operación">
              {options.operations.map((op) => (
                <Chip
                  key={op}
                  on={filters.operation === op}
                  onClick={() => set({ operation: filters.operation === op ? null : op })}
                >
                  {OPERATION_LABELS[op]}
                </Chip>
              ))}
            </Group>
          )}

          {showType && (
            <Group label="Tipo">
              {options.types.map((t) => (
                <Chip key={t} on={filters.type === t} onClick={() => set({ type: filters.type === t ? null : t })}>
                  {propertyTypeLabel(t) ?? t}
                </Chip>
              ))}
            </Group>
          )}

          {showPartido && (
            <Group label="Ubicación">
              {options.partidos.length <= 4 ? (
                options.partidos.map((z) => (
                  <Chip
                    key={z}
                    on={filters.partido === z}
                    onClick={() => set({ partido: filters.partido === z ? null : z })}
                  >
                    {z}
                  </Chip>
                ))
              ) : (
                <select
                  aria-label="Ubicación"
                  value={filters.partido ?? ""}
                  onChange={(e) => set({ partido: e.target.value || null })}
                  className="h-11 rounded-full border bg-background px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Todas las zonas</option>
                  {options.partidos.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </select>
              )}
            </Group>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <p aria-live="polite">
          {active
            ? shown === total
              ? `Las ${total} propiedades coinciden`
              : `${shown} de ${total} ${total === 1 ? "propiedad" : "propiedades"}`
            : `${total} ${total === 1 ? "propiedad" : "propiedades"}`}
        </p>
        {active && (
          <button
            type="button"
            onClick={() => onChange({ q: "", partido: null, operation: null, type: null })}
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

const OPERATION_LABELS: Record<CatalogOperation, string> = {
  venta: "Venta",
  alquiler: "Alquiler",
};

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-full border px-4 text-sm font-medium transition-all duration-200",
        "active:scale-90 motion-safe:hover:scale-[1.04]",
        on
          ? "border-transparent bg-primary text-primary-foreground shadow-sm"
          : "bg-background text-muted-foreground hover:border-primary/40",
      )}
    >
      {children}
    </button>
  );
}
