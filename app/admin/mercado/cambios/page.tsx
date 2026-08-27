import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getMarketChanges } from "@/lib/db/market";
import { classifyChange, priceDeltaPct } from "@/lib/market/stats";
import { ChangesTable, type ChangeRow } from "./changes-table";

export const metadata = {
  title: "Cambios del mercado — Admin Jotaeme",
};

export const revalidate = 60;

/**
 * The full change log, with room to work.
 *
 * The dashboard carries a fourteen-row feed, which answers "what moved
 * lately" and nothing else. This page exists for the questions that need the
 * whole set: which listings cut price twice, what left the market in July,
 * whether a partido is moving differently from the rest.
 */
export default async function CambiosPage() {
  const raw = await getMarketChanges();

  const rows: ChangeRow[] = raw.map((r) => ({
    id: r.id,
    propertyId: r.property_id,
    changedAt: r.changed_at,
    kind: classifyChange(r),
    address: r.address,
    partido: r.partido,
    propertyType: r.property_type,
    source: r.source,
    url: r.url,
    isActive: r.is_active,
    oldValue: r.old_value,
    newValue: r.new_value,
    deltaPct: priceDeltaPct(r),
    priceAtChange:
      r.price_at_change === null ? null : Number(r.price_at_change),
    priceCurrencyAtChange: r.price_currency_at_change,
  }));

  const partidos = [...new Set(rows.map((r) => r.partido).filter(Boolean))].sort() as string[];

  return (
    <div className="px-6 py-8 space-y-6 max-w-6xl">
      <div>
        <Link
          href="/admin/mercado"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Volver a inteligencia de mercado
        </Link>
      </div>

      <header>
        <h1 className="text-2xl font-bold tracking-tight">Cambios del mercado</h1>
        <p className="text-muted-foreground mt-1">
          Todo lo que el pipeline detectó en el inventario scrapeado:{" "}
          {rows.length.toLocaleString("es-AR")} eventos. Cada corrida compara lo
          que ve contra lo que había y anota las diferencias.
        </p>
      </header>

      <ChangesTable rows={rows} partidos={partidos} />
    </div>
  );
}
