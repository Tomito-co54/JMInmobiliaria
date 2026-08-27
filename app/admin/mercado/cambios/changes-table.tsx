"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  TrendingDown,
  TrendingUp,
  CircleOff,
  CirclePlus,
  Tag,
  FileText,
  Ruler,
  MapPin,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { mean, median, type ChangeKind } from "@/lib/market/stats";

export interface ChangeRow {
  id: string;
  propertyId: string;
  changedAt: string;
  kind: ChangeKind;
  address: string | null;
  partido: string | null;
  propertyType: string | null;
  source: string;
  url: string | null;
  isActive: boolean;
  oldValue: string | null;
  newValue: string | null;
  deltaPct: number | null;
  priceAtChange: number | null;
  priceCurrencyAtChange: string | null;
}

/**
 * Kinds in the order a broker cares about them, not alphabetically: price
 * moves and market entries/exits first, edits last.
 */
const KINDS: { id: ChangeKind; label: string }[] = [
  { id: "price_drop", label: "Bajó de precio" },
  { id: "price_rise", label: "Subió de precio" },
  { id: "delisted", label: "Salió del mercado" },
  { id: "relisted", label: "Volvió al mercado" },
  { id: "type_change", label: "Cambió de tipo" },
  { id: "surface_change", label: "Cambió superficie" },
  { id: "address_change", label: "Cambió dirección" },
  { id: "description_change", label: "Reescribió el aviso" },
];

const SELECT_CLASS =
  "h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function fmtInt(n: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);
}

/** Signed, so a drop always reads as a drop. */
function fmtPct(n: number): string {
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

export function ChangesTable({
  rows,
  partidos,
}: {
  rows: ChangeRow[];
  partidos: string[];
}) {
  const [kind, setKind] = useState<ChangeKind | "all">("all");
  const [partido, setPartido] = useState("all");
  const [type, setType] = useState("all");
  // Descending by date is the only default that reads as "what happened".
  const [sort, setSort] = useState<"recent" | "oldest" | "delta">("recent");

  const types = useMemo(
    () =>
      [...new Set(rows.map((r) => r.propertyType).filter(Boolean))].sort() as string[],
    [rows],
  );

  const counts = useMemo(() => {
    const m = new Map<ChangeKind, number>();
    for (const r of rows) m.set(r.kind, (m.get(r.kind) ?? 0) + 1);
    return m;
  }, [rows]);

  const visible = useMemo(() => {
    const out = rows.filter(
      (r) =>
        (kind === "all" || r.kind === kind) &&
        (partido === "all" || r.partido === partido) &&
        (type === "all" || r.propertyType === type),
    );
    if (sort === "delta") {
      // Rows without a delta sink to the bottom rather than sorting as zero,
      // which would scatter them through the middle of the list.
      return [...out].sort((a, b) => {
        if (a.deltaPct === null) return 1;
        if (b.deltaPct === null) return -1;
        return a.deltaPct - b.deltaPct;
      });
    }
    return [...out].sort((a, b) =>
      sort === "recent"
        ? b.changedAt.localeCompare(a.changedAt)
        : a.changedAt.localeCompare(b.changedAt),
    );
  }, [rows, kind, partido, type, sort]);

  // Price movement across whatever is on screen. Recomputed from `visible`
  // rather than from all rows, so filtering to a partido or a property type
  // answers the question for that slice — which is the reason to filter.
  const priceStats = useMemo(() => {
    const deltas = visible
      .filter((r) => r.kind === "price_drop" || r.kind === "price_rise")
      .map((r) => r.deltaPct)
      .filter((d): d is number => d !== null);
    if (deltas.length === 0) return null;
    return {
      n: deltas.length,
      drops: deltas.filter((d) => d < 0).length,
      rises: deltas.filter((d) => d > 0).length,
      mean: mean(deltas),
      median: median(deltas),
    };
  }, [visible]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1">
          <span className="block text-xs text-muted-foreground">Tipo de cambio</span>
          <select
            className={SELECT_CLASS}
            value={kind}
            onChange={(e) => setKind(e.target.value as ChangeKind | "all")}
          >
            <option value="all">Todos ({rows.length})</option>
            {KINDS.filter((k) => (counts.get(k.id) ?? 0) > 0).map((k) => (
              <option key={k.id} value={k.id}>
                {k.label} ({counts.get(k.id)})
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="block text-xs text-muted-foreground">Partido</span>
          <select
            className={SELECT_CLASS}
            value={partido}
            onChange={(e) => setPartido(e.target.value)}
          >
            <option value="all">Todos</option>
            {partidos.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="block text-xs text-muted-foreground">
            Tipo de propiedad
          </span>
          <select
            className={SELECT_CLASS}
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="all">Todos</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="block text-xs text-muted-foreground">Orden</span>
          <select
            className={SELECT_CLASS}
            value={sort}
            onChange={(e) => setSort(e.target.value as "recent" | "oldest" | "delta")}
          >
            <option value="recent">Más reciente</option>
            <option value="oldest">Más antiguo</option>
            <option value="delta">Mayor baja de precio</option>
          </select>
        </label>

        <p className="text-sm text-muted-foreground ml-auto">
          {visible.length === rows.length
            ? `${rows.length} eventos`
            : `${visible.length} de ${rows.length}`}
        </p>
      </div>

      {priceStats && (
        <div className="rounded-md border bg-card px-4 py-3 flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <div>
            <p className="text-xs text-muted-foreground">Movimiento promedio</p>
            <p
              className={`text-xl font-semibold tabular-nums ${
                (priceStats.mean ?? 0) < 0
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {priceStats.mean === null ? "—" : fmtPct(priceStats.mean)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Mediana</p>
            <p className="text-xl font-semibold tabular-nums">
              {priceStats.median === null ? "—" : fmtPct(priceStats.median)}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            sobre {priceStats.n}{" "}
            {priceStats.n === 1 ? "cambio de precio" : "cambios de precio"}
            {priceStats.rises > 0 &&
              ` · ${priceStats.drops} ${priceStats.drops === 1 ? "baja" : "bajas"}, ${priceStats.rises} ${priceStats.rises === 1 ? "suba" : "subas"}`}
          </p>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="rounded-md border bg-card p-8 text-center text-sm text-muted-foreground">
          Ningún evento coincide con esos filtros.
        </div>
      ) : (
        <div className="border rounded-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b">
                <th className="text-left font-medium p-3">Propiedad</th>
                <th className="text-left font-medium p-3">Qué pasó</th>
                <th className="text-right font-medium p-3">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr
                  key={r.id}
                  className="border-b hover:bg-muted/30 transition-colors"
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Link
                        href={`/admin/properties/${r.propertyId}`}
                        className="font-medium hover:underline underline-offset-2 truncate"
                        title={r.address ?? ""}
                      >
                        {r.address ?? "(sin dirección)"}
                      </Link>
                      {r.url && (
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground shrink-0"
                          title="Ver el aviso original"
                        >
                          <ExternalLink className="size-3.5" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {[r.propertyType, r.partido].filter(Boolean).join(" · ") || "—"}
                      {!r.isActive && " · fuera del mercado"}
                    </p>
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-2">
                      <KindIcon kind={r.kind} />
                      <ChangeDescription row={r} />
                    </span>
                  </td>
                  <td className="p-3 text-right text-muted-foreground whitespace-nowrap tabular-nums">
                    {fmtDate(r.changedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function KindIcon({ kind }: { kind: ChangeKind }) {
  const cls = "size-4 shrink-0";
  if (kind === "price_drop")
    return <TrendingDown className={`${cls} text-emerald-600`} />;
  if (kind === "price_rise") return <TrendingUp className={`${cls} text-red-600`} />;
  if (kind === "delisted")
    return <CircleOff className={`${cls} text-muted-foreground`} />;
  if (kind === "relisted") return <CirclePlus className={`${cls} text-primary`} />;
  if (kind === "type_change") return <Tag className={cls} />;
  if (kind === "surface_change") return <Ruler className={cls} />;
  if (kind === "address_change") return <MapPin className={cls} />;
  return <FileText className={`${cls} text-muted-foreground`} />;
}

function ChangeDescription({ row }: { row: ChangeRow }) {
  const snapshot =
    row.priceAtChange === null
      ? null
      : `${row.priceCurrencyAtChange ?? "USD"} ${fmtInt(row.priceAtChange)}`;

  if (row.kind === "price_drop" || row.kind === "price_rise") {
    return (
      <span className="inline-flex items-center gap-1 tabular-nums">
        {fmtInt(Number(row.oldValue))}
        <ArrowRight className="size-3" />
        {fmtInt(Number(row.newValue))}
        {row.deltaPct !== null && (
          <span
            className={
              row.kind === "price_drop"
                ? "text-emerald-700 dark:text-emerald-400 font-medium"
                : "text-red-600 dark:text-red-400 font-medium"
            }
          >
            ({row.deltaPct > 0 ? "+" : ""}
            {row.deltaPct.toFixed(0)}%)
          </span>
        )}
      </span>
    );
  }
  if (row.kind === "delisted") {
    return <span>Salió del mercado{snapshot ? ` a ${snapshot}` : ""}</span>;
  }
  if (row.kind === "relisted") {
    return <span>Volvió al mercado{snapshot ? ` a ${snapshot}` : ""}</span>;
  }
  if (row.kind === "type_change") {
    return (
      <span>
        Tipo: {row.oldValue} → {row.newValue}
      </span>
    );
  }
  if (row.kind === "surface_change") {
    return (
      <span className="tabular-nums">
        Superficie: {row.oldValue ?? "—"} → {row.newValue ?? "—"} m²
      </span>
    );
  }
  if (row.kind === "address_change") {
    return (
      <span>
        Dirección: {row.oldValue ?? "—"} → {row.newValue ?? "—"}
      </span>
    );
  }
  if (row.kind === "description_change") {
    return <span className="text-muted-foreground">Reescribió el aviso</span>;
  }
  return <span className="text-muted-foreground">Cambio</span>;
}
