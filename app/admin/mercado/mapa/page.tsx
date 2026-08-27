import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getScrapedInventory, getUsdPerM2MediansByType } from "@/lib/db/market";
import { MarketMapClient } from "./market-map-client";

export const metadata = {
  title: "Mapa de mercado — Admin Jotaeme",
};

export const revalidate = 60;

/**
 * The scraped inventory on a map, with an area you can draw over it.
 *
 * The dashboard answers "what is the market doing" in aggregate. This answers
 * the question a broker actually has in front of a property: what are the ten
 * blocks around this one asking? A median over the whole partido cannot say
 * that — the spread inside Lomas de Zamora is wider than the difference
 * between partidos.
 */
export default async function MapaMercadoPage() {
  const [rows, medians] = await Promise.all([
    getScrapedInventory(),
    getUsdPerM2MediansByType(),
  ]);

  const located = rows.filter((r) => r.lat !== null && r.lng !== null).length;

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
        <h1 className="text-2xl font-bold tracking-tight">Mapa de mercado</h1>
        <p className="text-muted-foreground mt-1">
          {located.toLocaleString("es-AR")} de {rows.length.toLocaleString("es-AR")}{" "}
          avisos scrapeados tienen coordenadas. Dibujá un área para leer sus
          números por separado.
        </p>
      </header>

      <MarketMapClient rows={rows} medians={medians} />
    </div>
  );
}
