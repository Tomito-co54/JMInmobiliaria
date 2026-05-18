import { ArrowDown, ArrowUp, Clock, Power, RotateCcw, MapPinned, Maximize2, Pencil } from "lucide-react";
import {
  classifyHistoryEvent,
  computeDaysOnMarket,
  type HistoryEventKind,
  type PropertyHistoryRow,
} from "@/lib/db/property-history";
import { cn } from "@/lib/utils";

/**
 * Per-property history timeline.
 *
 * Reuses the helpers in lib/db/property-history.ts (classifyHistoryEvent for
 * event kinds, computeDaysOnMarket for the lead-in). We deliberately render
 * a *short* timeline (newest 8 events) — the admin page already has the
 * full audit log; the buyer-facing version is meant to be scannable.
 *
 * For a freshly tracked listing (history is empty), we still show the
 * "X días en mercado" header so the buyer sees what we know.
 */

const EVENT_LABEL: Record<HistoryEventKind, string> = {
  price_change: "Cambio de precio",
  deactivated: "Listado dado de baja",
  reactivated: "Listado reactivado",
  address_change: "Cambio de dirección",
  surface_change: "Cambio de superficie",
  other: "Otro cambio",
};

const EVENT_ICON: Record<HistoryEventKind, typeof Clock> = {
  price_change: Clock,
  deactivated: Power,
  reactivated: RotateCcw,
  address_change: MapPinned,
  surface_change: Maximize2,
  other: Pencil,
};

const MAX_EVENTS = 8;

interface PropertyHistoryProps {
  history: PropertyHistoryRow[];
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  isActive: boolean;
  priceCurrency: string | null;
}

function fmtPrice(n: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function renderPriceTransition(
  row: PropertyHistoryRow,
  currency: string,
): React.ReactNode {
  const oldN = parseFloat(row.old_value ?? "");
  const newN = parseFloat(row.new_value ?? "");
  if (!Number.isFinite(oldN) || !Number.isFinite(newN)) {
    return <span className="text-muted-foreground">{row.old_value} → {row.new_value}</span>;
  }
  const dropped = newN < oldN;
  const diff = newN - oldN;
  const pct = oldN !== 0 ? (diff / oldN) * 100 : 0;
  return (
    <span className="font-mono tabular-nums text-xs">
      <span className="text-muted-foreground">
        {currency} {fmtPrice(oldN)}
      </span>
      <span className="mx-1.5 text-muted-foreground">→</span>
      <span
        className={cn(
          "inline-flex items-center gap-1 font-semibold",
          dropped ? "text-emerald-600" : "text-red-600",
        )}
      >
        {currency} {fmtPrice(newN)}
        {dropped ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />}
        <span className="text-[0.7rem] font-normal">
          ({pct > 0 ? "+" : ""}
          {pct.toFixed(1)}%)
        </span>
      </span>
    </span>
  );
}

export function PropertyHistory({
  history,
  firstSeenAt,
  lastSeenAt,
  isActive,
  priceCurrency,
}: PropertyHistoryProps) {
  const days = computeDaysOnMarket({
    first_seen_at: firstSeenAt,
    last_seen_at: lastSeenAt,
    is_active: isActive,
  });
  const visible = history.slice(0, MAX_EVENTS);
  const currency = priceCurrency ?? "";

  return (
    <section className="rounded-lg border bg-card p-5 sm:p-6 space-y-4">
      <header className="space-y-1">
        <h2 className="font-semibold text-base">Historial</h2>
        {days !== null && (
          <p className="text-xs text-muted-foreground">
            {isActive ? "Lo seguimos hace" : "Lo seguimos durante"}{" "}
            <span className="font-medium text-foreground tabular-nums">
              {days} {days === 1 ? "día" : "días"}
            </span>
            {firstSeenAt && (
              <>
                {" "}— desde {fmtDate(firstSeenAt)}
              </>
            )}
            .
          </p>
        )}
      </header>

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          Sin cambios registrados desde que empezamos a seguir esta propiedad.
        </p>
      ) : (
        <ol className="space-y-3">
          {visible.map((row) => {
            const kind = classifyHistoryEvent(row);
            const Icon = EVENT_ICON[kind];
            return (
              <li key={row.id} className="flex items-start gap-3">
                <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border bg-muted/40">
                  <Icon className="size-3.5 text-muted-foreground" aria-hidden />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-sm font-medium">{EVENT_LABEL[kind]}</p>
                  <div className="text-xs text-muted-foreground flex flex-wrap items-baseline gap-x-3">
                    <span>{fmtDate(row.changed_at)}</span>
                    {kind === "price_change" && renderPriceTransition(row, currency)}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {history.length > MAX_EVENTS && (
        <p className="text-[0.7rem] text-muted-foreground italic">
          Mostrando los {MAX_EVENTS} cambios más recientes de {history.length} registrados.
        </p>
      )}
    </section>
  );
}
