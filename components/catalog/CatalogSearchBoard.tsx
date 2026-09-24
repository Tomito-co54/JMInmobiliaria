"use client";

import { useState } from "react";
import { ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { propertyTypeLabel } from "@/lib/property/types";
import { MatchPreferencesForm } from "@/components/matching/MatchPreferencesForm";
import type { MatchPreferences } from "@/lib/matching/preferences";
import type {
  CatalogFilters,
  CatalogOperation,
  CatalogOptions,
} from "@/lib/catalog/filters";

/**
 * The board beside the results: what the visitor searched for, and what they
 * could still say to narrow it.
 *
 * Two halves on purpose. "Tu búsqueda" holds the three intro answers, which
 * are filters — change one and the list changes. "Afiná con el match" holds
 * the rest of the match questions, which order rather than exclude, and says
 * out loud which ones are still unanswered: the list is not wrong without
 * them, it is just less personal, and the visitor should know it can be more.
 *
 * On a phone it folds into one line above the list — the results are what
 * someone came for — and opens on a tap. On a wide screen it stands open
 * beside them and follows the scroll.
 */

const OPERATION_LABELS: Record<CatalogOperation, string> = { venta: "Compra", alquiler: "Alquiler" };

const MISSING_LABELS: { key: keyof MatchPreferences; label: string }[] = [
  { key: "priceMax", label: "presupuesto" },
  { key: "roomsMin", label: "ambientes" },
  { key: "surfaceMin", label: "superficie" },
  { key: "maxAgeYears", label: "antigüedad" },
];

export function missingCriteria(p: MatchPreferences): string[] {
  return MISSING_LABELS.filter(({ key }) => p[key] === null).map(({ label }) => label);
}

function listInSpanish(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items.at(-1)}`;
}

export function CatalogSearchBoard({
  filters,
  options,
  onFiltersChange,
  preferences,
  onPreferencesChange,
  onRestart,
  className,
}: {
  filters: CatalogFilters;
  options: CatalogOptions;
  onFiltersChange: (next: CatalogFilters) => void;
  preferences: MatchPreferences;
  onPreferencesChange: (next: MatchPreferences) => void;
  /** Back to the three questions. */
  onRestart: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const set = (patch: Partial<CatalogFilters>) => onFiltersChange({ ...filters, ...patch });
  const missing = missingCriteria(preferences);

  // Operation and type are one answer each; the place can be several at
  // once (Tomy, 24-sep-2026: "Banfield o Temperley"). "Cualquiera" clears.
  const single = (value: string | null, pick: (v: string | null) => void) => ({
    isOn: (v: string) => value === v,
    anyOn: value !== null,
    toggle: (v: string) => pick(value === v ? null : v),
    clear: () => pick(null),
  });
  const rows = [
    options.operations.length > 1 && {
      label: "Operación",
      choices: options.operations.map((o) => ({ value: o, label: OPERATION_LABELS[o] })),
      ...single(filters.operation, (v) => set({ operation: v as CatalogOperation | null })),
    },
    options.types.length > 1 && {
      label: "Tipo",
      choices: options.types.map((t) => ({ value: t, label: propertyTypeLabel(t) ?? t })),
      ...single(filters.type, (v) => set({ type: v })),
    },
    options.localidades.length > 1 && {
      label: "Ubicación",
      hint: "podés elegir varias",
      choices: options.localidades.map((l) => ({ value: l, label: l })),
      isOn: (v: string) => filters.localidades.includes(v),
      anyOn: filters.localidades.length > 0,
      toggle: (v: string) =>
        set({
          localidades: filters.localidades.includes(v)
            ? filters.localidades.filter((l) => l !== v)
            : [...filters.localidades, v],
        }),
      clear: () => set({ localidades: [] }),
    },
  ].filter(Boolean) as {
    label: string;
    hint?: string;
    choices: { value: string; label: string }[];
    isOn: (v: string) => boolean;
    anyOn: boolean;
    toggle: (v: string) => void;
    clear: () => void;
  }[];

  const summary =
    missing.length === 0
      ? "Búsqueda completa"
      : `Podés afinar ${missing.length === 1 ? "1 criterio más" : `${missing.length} criterios más`}`;

  return (
    <aside className={cn("rounded-3xl border bg-card", className)} aria-label="Tu búsqueda">
      {/* The fold is a phone thing: on a wide screen the board is always open. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full min-h-14 items-center gap-3 px-4 py-3 text-left lg:hidden"
      >
        <SlidersHorizontal className="size-4 shrink-0" style={{ color: "var(--brand-gold)" }} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium" style={{ color: "var(--brand-heading)" }}>
            Tu búsqueda
          </span>
          <span className="block truncate text-xs text-muted-foreground">{summary}</span>
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
          aria-hidden
        />
      </button>

      <div className={cn("space-y-6 px-4 pb-5 sm:px-5 lg:block lg:pt-5", open ? "block" : "hidden")}>
        <div className="space-y-4">
          <p
            className="hidden text-xs uppercase tracking-[0.2em] font-medium lg:block"
            style={{ color: "var(--brand-gold)" }}
          >
            Tu búsqueda
          </p>
          {rows.map((row) => (
            <fieldset key={row.label} className="min-w-0">
              <legend className="mb-2 text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {row.label}
                {row.hint && <span className="ml-2 normal-case tracking-normal">· {row.hint}</span>}
              </legend>
              <div className="flex flex-wrap gap-2">
                {row.choices.map((c) => (
                  <Chip key={c.value} on={row.isOn(c.value)} onClick={() => row.toggle(c.value)}>
                    {c.label}
                  </Chip>
                ))}
                <Chip on={!row.anyOn} onClick={row.clear}>
                  Cualquiera
                </Chip>
              </div>
            </fieldset>
          ))}
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-4" aria-hidden />
            Empezar de nuevo
          </button>
        </div>

        <div className="space-y-4 border-t pt-5">
          <div className="space-y-1">
            <p
              className="text-xs uppercase tracking-[0.2em] font-medium"
              style={{ color: "var(--brand-gold)" }}
            >
              Afiná con el match
            </p>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {missing.length === 0
                ? "Completaste todos los criterios: las propiedades están ordenadas por cuánto encajan."
                : `Te falta ${listInSpanish(missing)}. Sumalos y las propiedades se ordenan por cuánto encajan.`}
            </p>
          </div>
          <MatchPreferencesForm
            value={preferences}
            onChange={onPreferencesChange}
            omit={["operation", "zone", "type"]}
          />
        </div>
      </div>
    </aside>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
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
