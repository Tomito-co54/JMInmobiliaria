"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PropertiesFiltersProps {
  partidos: string[];
}

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      <div className="space-y-1">
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
        <Label htmlFor="status" className="text-xs">
          Estado
        </Label>
        <select
          id="status"
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={searchParams.get("status") ?? "all"}
          onChange={(e) => updateParams({ status: e.target.value || null })}
          disabled={isPending}
        >
          <option value="all">Todas</option>
          <option value="active">Solo activas</option>
          <option value="inactive">Solo inactivas</option>
        </select>
      </div>
    </div>
  );
}
