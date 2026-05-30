import {
  TrendingDown,
  TrendingUp,
  CircleOff,
  CirclePlus,
  Tag,
  ArrowRight,
} from "lucide-react";
import { MetricCard } from "@/components/shared/metric-card";
import { getScrapedInventory, getRecentPropertyHistory } from "@/lib/db/market";
import {
  computeKpis,
  distributionByType,
  usdPerM2,
  effectiveSurface,
  daysOnMarket,
  classifyChange,
  priceDeltaPct,
  type MarketRow,
  type UsdM2Summary,
  type ChangeKind,
} from "@/lib/market/stats";
import { InventoryTable, type InventoryRow } from "./inventory-table";

export const metadata = {
  title: "Inteligencia de mercado — Admin Jotaeme",
};

export const revalidate = 60;

const TYPE_LABELS: Record<string, string> = {
  casa: "Casas",
  departamento: "Departamentos",
  ph: "PH",
  lote: "Lotes",
  local: "Locales",
  "(sin tipo)": "Sin tipo",
};

const SMALL_SAMPLE = 8;

function fmtInt(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

export default async function MercadoPage() {
  const [rows, history] = await Promise.all([
    getScrapedInventory(),
    getRecentPropertyHistory(300),
  ]);

  const kpis = computeKpis(rows);
  const dist = distributionByType(rows);

  // Enrich rows for the explorer table (M2).
  const inventory: InventoryRow[] = rows.map((r) => {
    const surf = effectiveSurface(r);
    return {
      id: r.id,
      address: r.address,
      propertyType: r.property_type,
      source: r.source,
      isActive: r.is_active,
      price: r.price_amount === null ? null : Number(r.price_amount),
      currency: r.price_currency,
      surface: surf.value === null ? null : Math.round(surf.value),
      surfaceSource: surf.source,
      usdPerM2: (() => {
        const v = usdPerM2(r);
        return v === null ? null : Math.round(v);
      })(),
      qualityScore: r.quality_score === null ? null : Math.round(Number(r.quality_score)),
      daysOnMarket: daysOnMarket(r),
      url: r.url,
    };
  });

  // Change feed (M4) — intersect history with the scraped set, classify.
  const propMap = new Map<string, MarketRow>(rows.map((r) => [r.id, r]));
  const events = history
    .filter((h) => propMap.has(h.property_id))
    .map((h) => ({ h, kind: classifyChange(h), prop: propMap.get(h.property_id)! }))
    .filter((e) => e.kind !== "other");

  const priceDrops = events.filter((e) => e.kind === "price_drop").length;
  const delistings = events.filter((e) => e.kind === "delisted").length;

  // New listings: first seen in the last 7 days.
  const WEEK_MS = 7 * 86_400_000;
  const nowMs = Date.now();
  const nuevas = rows.filter(
    (r) => r.first_seen_at && nowMs - new Date(r.first_seen_at).getTime() <= WEEK_MS,
  ).length;

  const feed = events.slice(0, 14);

  return (
    <div className="px-6 py-8 space-y-8 max-w-6xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Inteligencia de mercado</h1>
        <p className="text-muted-foreground mt-1">
          Análisis del inventario scrapeado (Zonaprop · Trezza) — privado, no afecta tu
          catálogo. Datos de ~2 semanas; muestra chica, leer con cautela.
        </p>
      </header>

      {/* ---- M1: KPIs de cobertura ---- */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Avisos scrapeados"
          value={fmtInt(kpis.total)}
          hint={`${kpis.active} activos · ${kpis.inactive} inactivos`}
        />
        <MetricCard
          label="Por fuente"
          value={Object.entries(kpis.bySource)
            .map(([s, n]) => `${s} ${n}`)
            .join(" · ")}
        />
        <MetricCard
          label="Con USD/m² calculable"
          value={fmtInt(kpis.withUsdPerM2)}
          hint={`${kpis.withPrice} con precio · ${
            kpis.total ? Math.round((100 * kpis.withUsdPerM2) / kpis.total) : 0
          }% del total`}
        />
        <MetricCard
          label="Geolocalizados"
          value={fmtInt(kpis.geocoded)}
          hint={`${kpis.total ? Math.round((100 * kpis.geocoded) / kpis.total) : 0}% con lat/lng`}
        />
      </section>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* ---- M3: Distribución USD/m² por tipo ---- */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">USD/m² por tipo</h2>
            <p className="text-sm text-muted-foreground">
              Mediana (barra) y rango p25–p75. Usa superficie ARBA cuando existe.
            </p>
          </div>
          <DistributionChart overall={dist.overall} byType={dist.byType} />
        </section>

        {/* ---- M4: Feed de cambios ---- */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Cambios recientes</h2>
            <p className="text-sm text-muted-foreground">
              Detectados por el pipeline diario en el historial de avisos.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <MiniStat icon={<TrendingDown className="size-4" />} value={priceDrops} label="bajadas" tone="emerald" />
            <MiniStat icon={<CircleOff className="size-4" />} value={delistings} label="salieron" tone="muted" />
            <MiniStat icon={<CirclePlus className="size-4" />} value={nuevas} label="nuevas 7d" tone="primary" />
          </div>
          <ChangeFeed feed={feed} />
        </section>
      </div>

      {/* ---- M2: Explorador de inventario ---- */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Explorador de inventario</h2>
          <p className="text-sm text-muted-foreground">
            Todo el inventario scrapeado. Ordená por cualquier columna; el link abre el
            aviso original.
          </p>
        </div>
        <InventoryTable rows={inventory} />
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// M3 — distribution chart (server, SVG-free bars)
// ---------------------------------------------------------------------------
function DistributionChart({
  overall,
  byType,
}: {
  overall: UsdM2Summary;
  byType: { type: string; summary: UsdM2Summary }[];
}) {
  const maxP75 = Math.max(1, ...byType.map((t) => t.summary.p75 ?? t.summary.median ?? 0));

  if (byType.length === 0 || overall.n === 0) {
    return (
      <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
        Todavía no hay suficientes avisos con precio y superficie para calcular USD/m².
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-card p-5 space-y-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">Mediana general</span>
        <span className="text-xl font-bold tabular-nums">
          USD {fmtInt(overall.median)}/m²
          <span className="ml-2 text-xs font-normal text-muted-foreground">n={overall.n}</span>
        </span>
      </div>

      <div className="space-y-3">
        {byType.map((t) => {
          const s = t.summary;
          const med = s.median ?? 0;
          const p25 = s.p25 ?? med;
          const p75 = s.p75 ?? med;
          const left = (p25 / maxP75) * 100;
          const width = Math.max(1.5, ((p75 - p25) / maxP75) * 100);
          const medPos = (med / maxP75) * 100;
          const small = s.n < SMALL_SAMPLE;
          return (
            <div key={t.type} className="space-y-1">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">
                  {TYPE_LABELS[t.type] ?? t.type}
                  <span className="ml-2 text-xs text-muted-foreground">
                    n={s.n}
                    {small && <span className="ml-1 text-amber-600">· muestra chica</span>}
                  </span>
                </span>
                <span className="tabular-nums font-semibold">USD {fmtInt(med)}</span>
              </div>
              {/* p25–p75 range band with a median marker */}
              <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className="absolute top-0 h-full rounded-full"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    backgroundColor: "color-mix(in srgb, var(--brand-navy) 35%, transparent)",
                  }}
                />
                <div
                  className="absolute top-0 h-full w-0.5"
                  style={{ left: `${medPos}%`, backgroundColor: "var(--brand-navy)" }}
                />
              </div>
              <div className="flex justify-between text-[0.7rem] text-muted-foreground tabular-nums">
                <span>p25 {fmtInt(p25)}</span>
                <span>p75 {fmtInt(p75)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MiniStat({
  icon,
  value,
  label,
  tone,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  tone: "emerald" | "muted" | "primary";
}) {
  const toneCls =
    tone === "emerald"
      ? "text-emerald-600"
      : tone === "primary"
        ? "text-primary"
        : "text-muted-foreground";
  return (
    <div className="rounded-md border bg-card p-3 text-center">
      <div className={`flex justify-center ${toneCls}`}>{icon}</div>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// M4 — change feed (server)
// ---------------------------------------------------------------------------
function ChangeFeed({
  feed,
}: {
  feed: {
    h: { changed_at: string; old_value: string | null; new_value: string | null; field_changed: string };
    kind: ChangeKind;
    prop: MarketRow;
  }[];
}) {
  if (feed.length === 0) {
    return (
      <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
        Sin cambios registrados todavía. El pipeline los va detectando con cada corrida.
      </div>
    );
  }
  return (
    <ol className="rounded-md border bg-card divide-y">
      {feed.map((e, i) => (
        <li key={i} className="flex items-start gap-3 p-3">
          <ChangeIcon kind={e.kind} />
          <div className="min-w-0 flex-1">
            <p className="text-sm truncate" title={e.prop.address ?? ""}>
              {e.prop.address ?? "(sin dirección)"}
            </p>
            <p className="text-xs text-muted-foreground">
              <ChangeDetail entry={e.h} kind={e.kind} /> · {fmtDate(e.h.changed_at)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function ChangeIcon({ kind }: { kind: ChangeKind }) {
  if (kind === "price_drop")
    return <TrendingDown className="size-4 mt-0.5 shrink-0 text-emerald-600" />;
  if (kind === "price_rise")
    return <TrendingUp className="size-4 mt-0.5 shrink-0 text-red-600" />;
  if (kind === "delisted")
    return <CircleOff className="size-4 mt-0.5 shrink-0 text-muted-foreground" />;
  if (kind === "relisted")
    return <CirclePlus className="size-4 mt-0.5 shrink-0 text-primary" />;
  return <Tag className="size-4 mt-0.5 shrink-0 text-muted-foreground" />;
}

function ChangeDetail({
  entry,
  kind,
}: {
  entry: { old_value: string | null; new_value: string | null };
  kind: ChangeKind;
}) {
  if (kind === "price_drop" || kind === "price_rise") {
    const pct = priceDeltaPct({ field_changed: "price_amount", ...entry });
    return (
      <span className="inline-flex items-center gap-1">
        USD {fmtInt(Number(entry.old_value))}
        <ArrowRight className="size-3" />
        USD {fmtInt(Number(entry.new_value))}
        {pct !== null && (
          <span className={kind === "price_drop" ? "text-emerald-600" : "text-red-600"}>
            ({pct > 0 ? "+" : ""}
            {pct.toFixed(0)}%)
          </span>
        )}
      </span>
    );
  }
  if (kind === "delisted") return <>Salió del mercado</>;
  if (kind === "relisted") return <>Volvió al mercado</>;
  if (kind === "type_change")
    return (
      <>
        Tipo: {entry.old_value} → {entry.new_value}
      </>
    );
  return <>Cambio</>;
}
