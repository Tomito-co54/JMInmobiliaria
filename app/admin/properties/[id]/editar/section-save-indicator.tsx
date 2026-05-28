"use client";

import { Check, Loader2, CircleAlert, CircleDot } from "lucide-react";
import type { AutoSaveStatus } from "@/hooks/use-autosave";

/**
 * Compact pill next to a section title that reflects the autosave hook's
 * current state. Designed to be dense and non-distracting — three words
 * max, no extra layout.
 */
export function SectionSaveIndicator({
  status,
  lastError,
}: {
  status: AutoSaveStatus;
  lastError: string | null;
}) {
  switch (status) {
    case "saving":
      return (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          Guardando…
        </span>
      );
    case "saved":
      return (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
          <Check className="size-3" />
          Guardado
        </span>
      );
    case "dirty":
      return (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <CircleDot className="size-3" />
          Cambios sin guardar
        </span>
      );
    case "error":
      return (
        <span
          className="inline-flex items-center gap-1 text-xs text-destructive"
          title={lastError ?? undefined}
        >
          <CircleAlert className="size-3" />
          Error al guardar
        </span>
      );
    case "idle":
    default:
      return null;
  }
}
