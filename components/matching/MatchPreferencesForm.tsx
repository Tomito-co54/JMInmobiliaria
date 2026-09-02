"use client";

import { cn } from "@/lib/utils";
import { PARTIDOS_ZONA_SUR } from "@/lib/zona-sur/partidos";
import {
  AGE_MAX_OPTIONS,
  MATCH_OPERATIONS,
  MATCH_PROPERTY_TYPES,
  priceScaleFor,
  SURFACE_MIN_CEILING,
  SURFACE_MIN_FLOOR,
  SURFACE_MIN_STEP,
  type MatchPreferences,
} from "@/lib/matching/preferences";

/**
 * The six questions, asked once and shared by both surfaces that ask them.
 *
 * One component rather than two because the home and the listing page must
 * not drift into asking slightly different questions — the answers feed the
 * same matcher, and a control that exists in one place and not the other
 * would silently change what a visitor's score means depending on where they
 * set it (§2.5, mundo cohesivo).
 *
 * Every control is a tap target of at least 44px and reacts on tap rather
 * than hover (§2.2 — en mobile el tap es el hover). Nothing here is a
 * submit: each change applies immediately, because the whole point is
 * watching the number move.
 */

const TYPE_LABELS: Record<string, string> = {
  casa: "Casa",
  departamento: "Depto",
  ph: "PH",
};

const ROOM_OPTIONS = [1, 2, 3, 4] as const;

const AGE_LABELS: Record<number, string> = {
  0: "A estrenar",
  10: "Hasta 10 años",
  30: "Hasta 30",
  50: "Hasta 50",
};

function Chip({
  on,
  onClick,
  children,
  label,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-full border px-4 text-sm font-medium transition-all duration-200",
        "active:scale-90 motion-safe:hover:scale-[1.04]",
        on
          ? "border-transparent bg-primary text-primary-foreground shadow-sm"
          : "bg-card text-muted-foreground hover:border-primary/40",
      )}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[0.7rem] uppercase tracking-[0.18em] font-medium text-muted-foreground">
          {label}
        </p>
        {hint && (
          <p className="text-xs text-muted-foreground tabular-nums">{hint}</p>
        )}
      </div>
      <div className="mt-2.5">{children}</div>
    </div>
  );
}

export function MatchPreferencesForm({
  value,
  onChange,
  className,
  operations,
}: {
  value: MatchPreferences;
  onChange: (next: MatchPreferences) => void;
  className?: string;
  /**
   * The operations present in the catalog this form is shown beside.
   *
   * The buy/rent question only appears when there is more than one, because
   * a control with a single real position is not a question — it is a claim
   * that the visitor has a choice they do not have. It turns itself on the
   * day a rental is published and needs no edit here.
   *
   * The exception is a visitor who already answered: their choice stays
   * visible and clearable even if the catalog has since narrowed, so nobody
   * is left filtered into an operation with no control to undo it.
   */
  operations?: ReadonlyArray<string | null | undefined>;
}) {
  const toggle = (list: string[], item: string) =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

  const distinctOperations = new Set(
    (operations ?? []).filter((o): o is string => o === "venta" || o === "alquiler"),
  );
  const showOperation = distinctOperations.size > 1 || value.operation !== null;

  // The slider's top notch means "no ceiling", not its literal value — a
  // buyer who pushes it to the end is saying price is not their constraint,
  // and pinning them to the top would penalise the listings they are most
  // relaxed about.
  //
  // Which slider it is depends on the operation: a sale ceiling in dollars
  // and a monthly rent in pesos are different quantities, so the control is
  // rebuilt rather than relabelled when the visitor switches.
  const scale = priceScaleFor(value.operation);
  const money = scale.currency === "ARS" ? "$" : "USD";
  const sliderValue = value.priceMax ?? scale.ceiling;
  const priceLabel =
    value.priceMax === null
      ? "Sin límite"
      : `Hasta ${money} ${value.priceMax.toLocaleString("es-AR")}${scale.period}`;

  // Mirrors the price control, at the other end: parked at the floor means
  // "no minimum", so the absence of a constraint is the slider's rest state
  // rather than a 20 m² requirement nobody typed.
  const surfaceValue = value.surfaceMin ?? SURFACE_MIN_FLOOR;
  const surfaceLabel =
    value.surfaceMin === null ? "Sin mínimo" : `Desde ${value.surfaceMin} m²`;

  return (
    <div className={cn("space-y-6", className)}>
      {showOperation ? (
        <Field label="Operación">
          <div className="flex flex-wrap gap-2">
            {MATCH_OPERATIONS.map((op) => (
              <Chip
                key={op}
                on={value.operation === op}
                label={op === "venta" ? "Comprar" : "Alquilar"}
                onClick={() =>
                  onChange({
                    ...value,
                    operation: value.operation === op ? null : op,
                    // The ceiling is measured on the operation's own scale, so
                    // carrying it across would silently reinterpret the number
                    // — a rent of 600.000 becoming a purchase budget of 600.000.
                    priceMax: null,
                  })
                }
              >
                {op === "venta" ? "Comprar" : "Alquilar"}
              </Chip>
            ))}
          </div>
        </Field>
      ) : null}

      <Field label="Zona">
        <div className="flex flex-wrap gap-2">
          {PARTIDOS_ZONA_SUR.map((p) => (
            <Chip
              key={p}
              on={value.partidos.includes(p)}
              onClick={() =>
                onChange({ ...value, partidos: toggle(value.partidos, p) })
              }
            >
              {p}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Presupuesto" hint={priceLabel}>
        <input
          type="range"
          min={scale.floor}
          max={scale.ceiling}
          step={scale.step}
          value={sliderValue}
          aria-label={
            scale.currency === "ARS"
              ? "Alquiler máximo por mes en pesos"
              : "Presupuesto máximo en dólares"
          }
          aria-valuetext={priceLabel}
          onChange={(e) => {
            const n = Number(e.target.value);
            onChange({
              ...value,
              priceMax: n >= scale.ceiling ? null : n,
            });
          }}
          className="w-full accent-[var(--brand-gold)] h-11 cursor-pointer"
        />
      </Field>

      <Field label="Ambientes" hint="mínimo">
        <div className="flex flex-wrap gap-2">
          {ROOM_OPTIONS.map((n) => (
            <Chip
              key={n}
              on={value.roomsMin === n}
              label={`${n} ambientes o más`}
              onClick={() =>
                onChange({ ...value, roomsMin: value.roomsMin === n ? null : n })
              }
            >
              {n === 4 ? "4+" : n}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Tipo">
        <div className="flex flex-wrap gap-2">
          {MATCH_PROPERTY_TYPES.map((t) => (
            <Chip
              key={t}
              on={value.propertyTypes.includes(t)}
              onClick={() =>
                onChange({
                  ...value,
                  propertyTypes: toggle(value.propertyTypes, t),
                })
              }
            >
              {TYPE_LABELS[t] ?? t}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Superficie" hint={surfaceLabel}>
        <input
          type="range"
          min={SURFACE_MIN_FLOOR}
          max={SURFACE_MIN_CEILING}
          step={SURFACE_MIN_STEP}
          value={surfaceValue}
          aria-label="Superficie mínima en metros cuadrados"
          aria-valuetext={surfaceLabel}
          onChange={(e) => {
            const n = Number(e.target.value);
            onChange({
              ...value,
              surfaceMin: n <= SURFACE_MIN_FLOOR ? null : n,
            });
          }}
          className="w-full accent-[var(--brand-gold)] h-11 cursor-pointer"
        />
      </Field>

      <Field label="Antigüedad" hint="de la construcción">
        <div className="flex flex-wrap gap-2">
          {AGE_MAX_OPTIONS.map((n) => (
            <Chip
              key={n}
              on={value.maxAgeYears === n}
              label={n === 0 ? "A estrenar" : `Hasta ${n} años de antigüedad`}
              onClick={() =>
                onChange({
                  ...value,
                  maxAgeYears: value.maxAgeYears === n ? null : n,
                })
              }
            >
              {AGE_LABELS[n] ?? `${n}`}
            </Chip>
          ))}
        </div>
      </Field>
    </div>
  );
}
