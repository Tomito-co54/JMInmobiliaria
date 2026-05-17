"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UsersFilters() {
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
    params.delete("page");

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  function handleSearchChange(value: string) {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => updateParams({ search: value }), 400);
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="search" className="text-xs">
          Buscar
        </Label>
        <Input
          id="search"
          placeholder="Email o nombre..."
          defaultValue={searchParams.get("search") ?? ""}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="role" className="text-xs">
          Rol
        </Label>
        <select
          id="role"
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={searchParams.get("role") ?? "all"}
          onChange={(e) => updateParams({ role: e.target.value || null })}
          disabled={isPending}
        >
          <option value="all">Todos</option>
          <option value="buyer">Comprador</option>
          <option value="agency">Inmobiliaria</option>
          <option value="admin">Admin</option>
        </select>
      </div>
    </div>
  );
}
