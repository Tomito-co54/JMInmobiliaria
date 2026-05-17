"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
}: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function pageHref(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (p === 1) {
      params.delete("page");
    } else {
      params.set("page", String(p));
    }
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const fromIndex = (page - 1) * pageSize + 1;
  const toIndex = Math.min(page * pageSize, total);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="flex items-center justify-between gap-4 pt-3">
      <p className="text-sm text-muted-foreground">
        {total === 0
          ? "Sin resultados"
          : `Mostrando ${fromIndex}-${toIndex} de ${total.toLocaleString("es-AR")}`}
      </p>

      <div className="flex items-center gap-2">
        <Link
          href={canPrev ? pageHref(page - 1) : "#"}
          aria-disabled={!canPrev}
          tabIndex={canPrev ? 0 : -1}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            !canPrev && "pointer-events-none opacity-50",
          )}
        >
          <ChevronLeft className="size-3.5" />
          Anterior
        </Link>
        <span className="text-sm text-muted-foreground">
          Página {page} de {totalPages}
        </span>
        <Link
          href={canNext ? pageHref(page + 1) : "#"}
          aria-disabled={!canNext}
          tabIndex={canNext ? 0 : -1}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            !canNext && "pointer-events-none opacity-50",
          )}
        >
          Siguiente
          <ChevronRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
