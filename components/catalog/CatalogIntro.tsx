"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building,
  Building2,
  Car,
  CalendarClock,
  House,
  KeyRound,
  LandPlot,
  MapPin,
  Store,
  Tractor,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { propertyTypeLabel } from "@/lib/property/types";
import {
  narrowedOptions,
  type CatalogFilters,
  type CatalogOperation,
  type CatalogProperty,
} from "@/lib/catalog/filters";

/**
 * The way into the catalog: three questions, one at a time — what operation,
 * what kind of property, where — before the list.
 *
 * It asks nothing the filters and the match do not already ask; what it adds
 * is the order and the pace. A bar of chips is a tool for someone who already
 * knows the catalog. One question at a time is how a person would ask it
 * across a desk, and it is §2.3 read literally: a process told as a sequence.
 *
 * Every option comes from the published catalog, narrowed by the answers
 * before it, so no path ends in an empty list: after "Alquiler" only the
 * types for rent are offered. A step with fewer than two real options is
 * skipped rather than shown — a question with one answer is not a question
 * (the rule the filter bar and the match form already follow). "Cualquiera"
 * is always there, because not caring is an answer.
 *
 * The answers are filters, not preferences: choosing "Departamento" leaves
 * the houses out (Tomy, 23-sep-2026). The match orders what is left.
 */

type StepKey = "operation" | "type" | "localidad";
/** One answer per question; the search itself may later hold several places. */
type Answers = { operation: CatalogOperation | null; type: string | null; localidad: string | null };
type Search = Pick<CatalogFilters, "operation" | "type" | "localidades">;

const toSearch = (a: Answers): Search => ({
  operation: a.operation,
  type: a.type,
  localidades: a.localidad ? [a.localidad] : [],
});

const STEPS: { key: StepKey; question: string; hint: string }[] = [
  { key: "operation", question: "¿Qué operación buscás?", hint: "Elegí una para empezar." },
  { key: "type", question: "¿Qué tipo de propiedad?", hint: "Sólo te mostramos las que tenemos publicadas." },
  { key: "localidad", question: "¿En qué ubicación?", hint: "Zona Sur del Gran Buenos Aires." },
];

const OPERATION_LABELS: Record<CatalogOperation, string> = { venta: "Compra", alquiler: "Alquiler" };
const OPERATION_ICONS: Record<CatalogOperation, LucideIcon> = { venta: KeyRound, alquiler: CalendarClock };
const TYPE_ICONS: Record<string, LucideIcon> = {
  casa: House,
  departamento: Building2,
  ph: Building,
  lote: LandPlot,
  local: Store,
  cochera: Car,
  deposito: Warehouse,
  oficina: Briefcase,
  galpon: Warehouse,
  campo: Tractor,
};

const EMPTY_ANSWERS: Answers = { operation: null, type: null, localidad: null };

/** What a step can offer, given the answers before it. */
function optionsFor(key: StepKey, list: readonly CatalogProperty[], answers: Answers): string[] {
  const opts = narrowedOptions(list, answers);
  return key === "operation" ? opts.operations : key === "type" ? opts.types : opts.localidades;
}

export function CatalogIntro({
  properties,
  resume,
  onDone,
  onSkip,
}: {
  properties: readonly CatalogProperty[];
  /** The last search of this visit, offered back instead of asked again. */
  resume: { label: string; filters: CatalogFilters } | null;
  onDone: (search: Search) => void;
  onSkip: () => void;
}) {
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [stepIndex, setStepIndex] = useState(0);
  const [history, setHistory] = useState<number[]>([]);

  // Only the steps that are real questions given what has been answered.
  const liveSteps = useMemo(
    () => STEPS.map((s, i) => ({ ...s, index: i, options: optionsFor(s.key, properties, answers) })),
    [properties, answers],
  );

  /** The first step at or after `from` that has something to ask. */
  const nextAskable = (from: number, a: Answers): number | null => {
    for (let i = from; i < STEPS.length; i++) {
      if (optionsFor(STEPS[i].key, properties, a).length > 1) return i;
    }
    return null;
  };

  // The catalog may have nothing to ask at all (one operation, one type, no
  // localidades yet): then the intro has nothing to offer and hands over.
  const firstAskable = nextAskable(0, EMPTY_ANSWERS);
  const current = firstAskable === null ? null : liveSteps[Math.max(stepIndex, firstAskable)];

  const answer = (value: string | null) => {
    if (!current) return;
    const next: Answers = { ...answers, [current.key]: value };
    // A later answer may no longer fit: after switching to "Alquiler", a
    // "Departamento" picked before is not on offer. Clear what follows.
    for (let i = current.index + 1; i < STEPS.length; i++) next[STEPS[i].key] = null;
    const following = nextAskable(current.index + 1, next);
    if (following === null) {
      onDone(toSearch(next));
      return;
    }
    setAnswers(next);
    setHistory((h) => [...h, current.index]);
    setStepIndex(following);
  };

  const back = () => {
    const prev = history.at(-1);
    if (prev === undefined) return;
    setHistory((h) => h.slice(0, -1));
    setStepIndex(prev);
  };

  if (!current) {
    return <SkipOnly onSkip={onSkip} />;
  }

  // Only the count so far: how many questions are left depends on the
  // answers ("Compra" may leave one type, and no second question).
  const position = history.length + 1;

  return (
    <section aria-labelledby="catalog-intro-question" className="mx-auto max-w-2xl py-6 sm:py-10">
      <p
        className="text-xs uppercase tracking-[0.2em] font-medium"
        style={{ color: "var(--brand-gold)" }}
      >
        Paso {position}
      </p>

      {/* Keyed by step so each question enters on its own (§2.4): the change
          of question is the thing that happened, and it should read as one. */}
      <div key={current.key} className="page-enter mt-6 space-y-6">
        <div className="space-y-2">
          <h2
            id="catalog-intro-question"
            className="font-heading text-3xl sm:text-4xl font-medium tracking-tight"
            style={{ color: "var(--brand-heading)" }}
          >
            {current.question}
          </h2>
          <p className="text-sm text-muted-foreground">{current.hint}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {current.options.map((value) => (
            <OptionTile
              key={value}
              icon={iconFor(current.key, value)}
              label={labelFor(current.key, value)}
              onClick={() => answer(value)}
            />
          ))}
          {current.key !== "operation" && (
            <OptionTile icon={null} label="Cualquiera" muted onClick={() => answer(null)} />
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        {history.length > 0 ? (
          <button
            type="button"
            onClick={back}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-foreground hover:bg-muted"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Volver
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onSkip}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Ver todas las propiedades
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>

      {resume && history.length === 0 && (
        <button
          type="button"
          onClick={() => onDone(resume.filters)}
          className="mt-6 flex w-full min-h-11 items-center justify-between gap-3 rounded-2xl border border-dashed px-4 py-3 text-left text-sm hover:border-primary/40"
        >
          <span>
            <span className="text-muted-foreground">Retomar tu búsqueda: </span>
            <span className="font-medium text-foreground">{resume.label}</span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      )}
    </section>
  );
}

function iconFor(key: StepKey, value: string): LucideIcon | null {
  if (key === "operation") return OPERATION_ICONS[value as CatalogOperation] ?? null;
  if (key === "type") return TYPE_ICONS[value] ?? Building;
  return MapPin;
}

function labelFor(key: StepKey, value: string): string {
  if (key === "operation") return OPERATION_LABELS[value as CatalogOperation] ?? value;
  if (key === "type") return propertyTypeLabel(value) ?? value;
  return value;
}

function OptionTile({
  icon: Icon,
  label,
  muted = false,
  onClick,
}: {
  icon: LucideIcon | null;
  label: string;
  muted?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex min-h-16 items-center gap-4 rounded-2xl border bg-card px-5 py-4 text-left transition-all duration-200",
        "hover:border-primary/40 hover:shadow-sm active:scale-[0.98] motion-safe:hover:-translate-y-0.5",
        muted && "border-dashed bg-transparent",
      )}
    >
      {Icon && (
        <span
          className="grid size-10 shrink-0 place-items-center rounded-xl transition-colors"
          style={{ backgroundColor: "var(--brand-icon-bg)", color: "var(--brand-icon-fg)" }}
        >
          <Icon className="size-5" aria-hidden />
        </span>
      )}
      <span
        className={cn("font-heading text-lg font-medium", muted ? "text-muted-foreground" : "")}
        style={muted ? undefined : { color: "var(--brand-heading)" }}
      >
        {label}
      </span>
    </button>
  );
}

function SkipOnly({ onSkip }: { onSkip: () => void }) {
  return (
    <div className="mx-auto max-w-2xl py-10 text-center">
      <button
        type="button"
        onClick={onSkip}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full border px-5 text-sm font-medium"
      >
        Ver las propiedades
        <ArrowRight className="size-4" aria-hidden />
      </button>
    </div>
  );
}

/** How a search reads in one line: "Departamento en venta · Banfield". */
export function describeSearch(f: Search): string | null {
  const type = f.type ? (propertyTypeLabel(f.type) ?? f.type) : "Propiedades";
  const op = f.operation === "venta" ? "en venta" : f.operation === "alquiler" ? "en alquiler" : null;
  const places =
    f.localidades.length === 0
      ? null
      : f.localidades.length === 1
        ? f.localidades[0]
        : f.localidades.length === 2
          ? `${f.localidades[0]} y ${f.localidades[1]}`
          : `${f.localidades.length} ubicaciones`;
  if (!f.type && !f.operation && !places) return null;
  return [[type, op].filter(Boolean).join(" "), places].filter(Boolean).join(" · ");
}
