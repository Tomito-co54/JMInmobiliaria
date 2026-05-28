"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PropertiesFiltersProps {
  partidos: string[];
}

/**
 * Five orthogonal filter controls — pick any combination, results AND.
 *
 *   buscar           free-text against address/partido (debounced)
 *   partido          one of the known Zona Sur partidos
 *   tipo             casa / departamento / ph / lote / local
 *   origen           mías / scrapeadas (or all)
 *   mercado          is_active (active / inactive)         — relevant to scrapeadas
 *   gestión          listing_status (borrador / publicada / vendida) — relevant to mías
 *
 * "Mercado" and "Gestión" are kept separate because they mean different
 * things and shouldn't be conflated. Setting both is valid (e.g. an
 * `active + publicada` combo narrows to the publicly-visible inventory).
 */
export function PropertiesFilters({ partidos }: PropertiesFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    // Reset to page 1 whenever filters change
    params.delete("page");

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  // Debounce search input
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  function handleSearchChange(value: string) {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => updateParams({ search: value }), 400);
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
      <div className="space-y-1 lg:col-span-2">
        <Label htmlFor="search" className="text-xs">
          Buscar
        </Label>
        <Input
          id="search"
          placeholder="Dirección o partido..."
          defaultValue={searchParams.get("search") ?? ""}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="partido" className="text-xs">
          Partido
        </Label>
        <select
          id="partido"
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={searchParams.get("partido") ?? ""}
          onChange={(e) => updateParams({ partido: e.target.value || null })}
          disabled={isPending}
        >
          <option value="">Todos</option>
          {partidos.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="propertyType" className="text-xs">
          Tipo
        </Label>
        <select
          id="propertyType"
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={searchParams.get("propertyType") ?? ""}
          onChange={(e) =>
            updateParams({ propertyType: e.target.value || null })
          }
          disabled={isPending}
        >
          <option value="">Todos</option>
          <option value="casa">Casa</option>
          <option value="departamento">Departamento</option>
          <option value="ph">PH</option>
          <option value="lote">Lote</option>
          <option value="local">Local</option>
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="sourceClass" className="text-xs">
          Origen
        </Label>
        <select
          id="sourceClass"
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={searchParams.get("sourceClass") ?? ""}
          onChange={(e) =>
            updateParams({ sourceClass: e.target.value || null })
          }
          disabled={isPending}
        >
          <option value="">Todas</option>
          <option value="mias">Mías</option>
          <option value="scrapeadas">Scrapeadas</option>
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="listingStatus" className="text-xs" title="Editorial — mis propiedades">
          Gestión
        </Label>
        <select
          id="listingStatus"
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={searchParams.get("listingStatus") ?? ""}
          onChange={(e) =>
            updateParams({ listingStatus: e.target.value || null })
          }
          disabled={isPending}
        >
          <option value="">Todas</option>
          <option value="borrador">Borrador</option>
          <option value="publicada">Publicada</option>
          <option value="vendida">Vendida</option>
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="marketStatus" className="text-xs" title="Aviso vivo en el portal — scrapeadas">
          Mercado
        </Label>
        <select
          id="marketStatus"
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={searchParams.get("marketStatus") ?? ""}
          onChange={(e) =>
            updateParams({ marketStatus: e.target.value || null })
          }
          disabled={isPending}
        >
          <option value="">Todas</option>
          <option value="active">Activa</option>
          <option value="inactive">Inactiva</option>
        </select>
      </div>
    </div>
  );
}
