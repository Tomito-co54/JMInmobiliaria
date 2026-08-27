import Link from "next/link";
import {
  TrendingDown,
  TrendingUp,
  CircleOff,
  CirclePlus,
  Tag,
  ArrowRight,
  Map as MapIcon,
} from "lucide-react";
import { MetricCard } from "@/components/shared/metric-card";
import { buttonVariants } from "@/components/ui/button";
import { getScrapedInventory, getRecentPropertyHistory } from "@/lib/db/market";
import {
  computeKpis,
  distributionByType,
  scoreBandDistribution,
  usdPerM2,
  effectiveSurface,
  countImplausibleSurfaces,
  SURFACE_MIN_M2,
  SURFACE_MAX_M2,
  daysOnMarket,
  classifyChange,
  priceDeltaPct,
  HIGH_SIGNAL_KINDS,
  type MarketRow,
  type UsdM2Summary,
  type ScoreDistribution,
  type ChangeKind,
} from "@/lib/market/stats";
import { listScoreBands, getScoreBand } from "@/lib/scoring/bands";
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
  // Rows carrying a surface we refuse to price on — each is a scraper
  // parsing bug, so the count is shown rather than quietly dropped.
  const surfaceOutliers = countImplausibleSurfaces(rows);
  const dist = distributionByType(rows);
  const scoreDist = scoreBandDistribution(
    rows,
    listScoreBands(),
    (s) => getScoreBand(s).id,
  );

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
    // El feed corto se queda con los de mayor senal. El resto — descripciones
    // reescritas, superficies corregidas — vive en /cambios, donde hay lugar
    // para filtrar en vez de competir por catorce lugares.
    .filter((e) => HIGH_SIGNAL_KINDS.includes(e.kind));

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
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
        <h1 className="text-2xl font-bold tracking-tight">Inteligencia de mercado</h1>
        <p className="text-muted-foreground mt-1">
          Análisis del inventario scrapeado (Zonaprop · Trezza) — privado, no
          afecta tu catálogo. {fmtInt(kpis.total)} avisos relevados; el más
          reciente, {fmtDate(kpis.lastSeenAt)}.
        </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/admin/mercado/mapa"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <MapIcon className="size-4" />
            Ver en el mapa
          </Link>
        </div>
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
              Mediana (barra) y rango p25–p75, sobre la{" "}
              <span className="font-medium text-foreground">
                superficie declarada
              </span>{" "}
              del aviso. Ojo al comparar tipos: en casas ese número suele ser
              el lote, y en departamentos la unidad.
            </p>
            {surfaceOutliers > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {surfaceOutliers}{" "}
                {surfaceOutliers === 1 ? "aviso excluido" : "avisos excluidos"}{" "}
                por superficie inverosímil (fuera de {SURFACE_MIN_M2}–
                {SURFACE_MAX_M2.toLocaleString("es-AR")} m²) — error de lectura
                del scraper, no del mercado.
              </p>
            )}
          </div>
          <DistributionChart overall={dist.overall} byType={dist.byType} />
        </section>

        {/* ---- M4: Feed de cambios ---- */}
        <section className="space-y-4">
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight">Cambios recientes</h2>
              <Link
                href="/admin/mercado/cambios"
                className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline shrink-0"
              >
                Ver todos →
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              Los últimos movimientos. El registro completo, con filtros, está
              en la página de cambios.
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

      {/* ---- M5: Distribución de Quality Score ---- */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Distribución de calidad</h2>
          <p className="text-sm text-muted-foreground">
            Cómo se reparte el Quality Score del mercado por banda.{" "}
            {scoreDist.scored} con score
            {scoreDist.unscored > 0 ? ` · ${scoreDist.unscored} sin calcular` : ""}.
          </p>
        </div>
        <ScoreHistogram dist={scoreDist} />
      </section>

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

// ---------------------------------------------------------------------------
// M5 — quality-score histogram (server). Vertical bars, one per band, colored
// with the canonical band hex (lib/scoring/bands.ts).
// ---------------------------------------------------------------------------
function ScoreHistogram({ dist }: { dist: ScoreDistribution }) {
  if (dist.scored === 0) {
    return (
      <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
        Todavía no hay avisos con Quality Score calculado.
      </div>
    );
  }
  const max = Math.max(1, dist.maxCount);
  return (
    <div className="rounded-md border bg-card p-5">
      {/* Bars share a fixed-height track; each grows to count/max. */}
      <div className="flex items-end gap-2 sm:gap-3 h-40">
        {dist.buckets.map((b) => {
          const pct = (b.count / max) * 100;
          return (
            <div key={b.id} className="flex-1 flex flex-col items-center justify-end h-full gap-2">
              <span className="text-sm font-bold tabular-nums" style={{ color: b.hex }}>
                {b.count}
              </span>
              <div
                className="w-full rounded-t-md transition-all"
                style={{
                  height: `${Math.max(b.count > 0 ? 6 : 2, pct)}%`,
                  backgroundColor: b.count > 0 ? b.hex : "var(--muted)",
                  opacity: b.count > 0 ? 1 : 0.5,
                }}
                title={`${b.label}: ${b.count}`}
              />
            </div>
          );
        })}
      </div>
      {/* Axis: band label + range under each bar. */}
      <div className="flex items-start gap-2 sm:gap-3 mt-2">
        {dist.buckets.map((b) => (
          <div key={b.id} className="flex-1 text-center">
            <p className="text-[0.7rem] font-medium leading-tight" style={{ color: b.hex }}>
              {b.label}
            </p>
            <p className="text-[0.65rem] text-muted-foreground tabular-nums">
              {b.min}–{b.max}
            </p>
          </div>
        ))}
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
    h: {
      changed_at: string;
      old_value: string | null;
      new_value: string | null;
      field_changed: string;
      price_at_change: number | string | null;
      price_currency_at_change: string | null;
    };
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
  entry: {
    old_value: string | null;
    new_value: string | null;
    price_at_change?: number | string | null;
    price_currency_at_change?: string | null;
  };
  kind: ChangeKind;
}) {
  // Price the listing carried at this event. Only exists on rows written
  // after migration 00014, so every use has to tolerate its absence.
  const snapshot =
    entry.price_at_change === null || entry.price_at_change === undefined
      ? null
      : `${entry.price_currency_at_change ?? "USD"} ${fmtInt(Number(entry.price_at_change))}`;

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
  if (kind === "delisted")
    return <>Salió del mercado{snapshot ? ` a ${snapshot}` : ""}</>;
  if (kind === "relisted")
    return <>Volvió al mercado{snapshot ? ` a ${snapshot}` : ""}</>;
  if (kind === "type_change")
    return (
      <>
        Tipo: {entry.old_value} → {entry.new_value}
      </>
    );
  return <>Cambio</>;
}
