"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Scraped-inventory explorer (M2). Client island for sorting + filtering;
 * all the heavy lifting (USD/m², days-on-market) is computed server-side
 * and passed in already enriched.
 */

export interface InventoryRow {
  id: string;
  address: string | null;
  propertyType: string | null;
  source: string;
  isActive: boolean;
  price: number | null;
  currency: string | null;
  surface: number | null;
  surfaceSource: "arba" | "declared" | null;
  usdPerM2: number | null;
  qualityScore: number | null;
  daysOnMarket: number | null;
  url: string | null;
}

type SortKey = "usdPerM2" | "price" | "surface" | "qualityScore" | "daysOnMarket" | "address";

const TYPE_LABELS: Record<string, string> = {
  casa: "Casa",
  departamento: "Depto",
  ph: "PH",
  lote: "Lote",
  local: "Local",
};

function fmtInt(n: number | null): string {
  return n === null ? "—" : new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);
}

export function InventoryTable({ rows }: { rows: InventoryRow[] }) {
  const [type, setType] = useState("");
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("usdPerM2");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sources = useMemo(
    () => Array.from(new Set(rows.map((r) => r.source))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const out = rows.filter((r) => {
      if (type && (r.propertyType ?? "") !== type) return false;
      if (source && r.source !== source) return false;
      if (status === "active" && !r.isActive) return false;
      if (status === "inactive" && r.isActive) return false;
      return true;
    });
    out.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      // Nulls always sort last regardless of direction.
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      let cmp: number;
      if (typeof av === "string" && typeof bv === "string") cmp = av.localeCompare(bv);
      else cmp = (av as number) - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return out;
  }, [rows, type, source, status, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "address" ? "asc" : "desc");
    }
  }

  function SortHeader({
    label,
    keyName,
    align = "right",
  }: {
    label: string;
    keyName: SortKey;
    align?: "left" | "right";
  }) {
    const active = sortKey === keyName;
    const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
    return (
      <th className={cn("font-medium p-3", align === "right" ? "text-right" : "text-left")}>
        <button
          type="button"
          onClick={() => toggleSort(keyName)}
          className={cn(
            "inline-flex items-center gap-1 hover:text-foreground transition-colors",
            align === "right" && "flex-row-reverse",
            active ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {label}
          <Icon className="size-3" />
        </button>
      </th>
    );
  }

  const selectCls =
    "h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select className={selectCls} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Todos los tipos</option>
          <option value="casa">Casa</option>
          <option value="departamento">Departamento</option>
          <option value="ph">PH</option>
          <option value="lote">Lote</option>
          <option value="local">Local</option>
        </select>
        <select className={selectCls} value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="">Todas las fuentes</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Activas e inactivas</option>
          <option value="active">Solo activas</option>
          <option value="inactive">Solo inactivas</option>
        </select>
        <span className="text-sm text-muted-foreground ml-auto tabular-nums">
          {filtered.length} de {rows.length}
        </span>
      </div>

      <div className="border rounded-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="border-b">
              <SortHeader label="Dirección" keyName="address" align="left" />
              <th className="text-left font-medium p-3 text-muted-foreground">Tipo</th>
              <SortHeader label="Precio" keyName="price" />
              <SortHeader label="m²" keyName="surface" />
              <SortHeader label="USD/m²" keyName="usdPerM2" />
              <SortHeader label="Score" keyName="qualityScore" />
              <SortHeader label="Días" keyName="daysOnMarket" />
              <th className="text-center font-medium p-3 text-muted-foreground">Estado</th>
              <th className="text-left font-medium p-3 text-muted-foreground">Fuente</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-muted-foreground">
                  Sin resultados con esos filtros.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="p-3 max-w-[16rem] truncate" title={r.address ?? ""}>
                    {r.address ?? "(sin dirección)"}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {r.propertyType ? TYPE_LABELS[r.propertyType] ?? r.propertyType : "—"}
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    {r.price !== null && r.currency ? `${r.currency} ${fmtInt(r.price)}` : "—"}
                  </td>
                  <td className="p-3 text-right tabular-nums text-muted-foreground">
                    {r.surface !== null ? (
                      <span className="inline-flex items-center gap-1">
                        {fmtInt(r.surface)}
                        <span
                          className={cn(
                            "text-[0.6rem] uppercase rounded px-1",
                            r.surfaceSource === "arba"
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground",
                          )}
                          title={r.surfaceSource === "arba" ? "Superficie ARBA (real)" : "Superficie declarada"}
                        >
                          {r.surfaceSource === "arba" ? "ARBA" : "decl"}
                        </span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-3 text-right tabular-nums font-medium">
                    {r.usdPerM2 !== null ? fmtInt(r.usdPerM2) : "—"}
                  </td>
                  <td className="p-3 text-right tabular-nums text-muted-foreground">
                    {r.qualityScore ?? "—"}
                  </td>
                  <td className="p-3 text-right tabular-nums text-muted-foreground">
                    {r.daysOnMarket !== null ? `${r.daysOnMarket}d` : "—"}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={cn(
                        "inline-block size-2 rounded-full",
                        r.isActive ? "bg-emerald-500" : "bg-muted-foreground/40",
                      )}
                      title={r.isActive ? "Activa" : "Inactiva"}
                    />
                  </td>
                  <td className="p-3 text-muted-foreground text-xs">{r.source}</td>
                  <td className="p-3 text-right">
                    {r.url && (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex text-muted-foreground hover:text-foreground"
                        title="Ver aviso original"
                      >
                        <ExternalLink className="size-4" />
                      </a>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
