import Link from "next/link";
import { getAllGroups } from "@/lib/db/groups";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Grupos de propiedades — Admin Jotaeme",
};

export const revalidate = 60;

export default async function AdminGroupsPage() {
  const groups = await getAllGroups();

  const totalListingsInGroups = groups.reduce(
    (sum, g) => sum + g.listings.length,
    0,
  );

  return (
    <div className="px-6 py-8 space-y-6 max-w-5xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          Grupos de propiedades
        </h1>
        <p className="text-muted-foreground mt-1">
          {groups.length} grupos · {totalListingsInGroups} listings agrupados ·
          Detectados por matching de direcciones, partida ARBA o coordenadas.
        </p>
      </header>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No hay grupos detectados todavía. Cuando dos listings refieran a
              la misma propiedad física, van a aparecer agrupados acá.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Corré <code className="bg-muted px-1 rounded">tsx scripts/dedup-properties.ts</code>{" "}
              después de cada scrape para detectar duplicados.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <Card key={g.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">
                      {g.signature ?? `Grupo ${g.id.slice(0, 8)}`}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {g.listings.length} listings ·{" "}
                      {new Date(g.created_at).toLocaleDateString("es-AR")}
                    </p>
                  </div>
                  <Badge variant="outline">{g.matched_by}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="divide-y text-sm">
                  {g.listings.map((l) => {
                    const isPrimary = l.id === g.primary_listing_id;
                    return (
                      <li key={l.id} className="py-2 flex items-center gap-3">
                        <Badge
                          variant={isPrimary ? "default" : "secondary"}
                          className="shrink-0 capitalize"
                        >
                          {l.source}
                        </Badge>
                        <Link
                          href={`/admin/properties/${l.id}`}
                          className="flex-1 min-w-0 hover:underline truncate"
                        >
                          {l.address ?? "(sin dirección)"}
                        </Link>
                        <span className="text-muted-foreground tabular-nums shrink-0">
                          {l.price_currency ?? "?"}{" "}
                          {l.price_amount?.toLocaleString("es-AR") ?? "?"}
                        </span>
                        {isPrimary && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            ★ primary
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
