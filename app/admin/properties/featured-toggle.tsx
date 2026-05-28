"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { toggleFeaturedAction } from "./actions";

/**
 * Inline star toggle to flag an owner property as "destacada" — the home
 * rotates between is_featured + listing_status='publicada' rows.
 *
 * Used as a row-level control in /admin/properties so the broker can curate
 * the rotation from the list without entering the editor.
 *
 * Optimistic UI: the icon flips instantly on click and rolls back if the
 * server action fails (rare — RLS or constraint violation).
 */
export function FeaturedToggle({
  propertyId,
  initial,
}: {
  propertyId: string;
  initial: boolean;
}) {
  const [featured, setFeatured] = useState(initial);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    const previous = featured;
    setFeatured(!previous); // optimistic
    startTransition(async () => {
      const result = await toggleFeaturedAction(propertyId);
      if (!result.ok) {
        setFeatured(previous); // rollback
        toast.error(result.error);
        return;
      }
      // Confirm with the server's answer (defensive — should match).
      if (result.data) setFeatured(result.data.is_featured);
      toast.success(
        result.data?.is_featured
          ? "Marcada como destacada"
          : "Quitada de destacadas",
      );
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      title={featured ? "Destacada — quitar" : "Marcar como destacada"}
      aria-pressed={featured}
      aria-label={featured ? "Quitar destacada" : "Marcar como destacada"}
      className={cn(
        "inline-flex items-center justify-center rounded-md size-7 transition-colors",
        "hover:bg-muted disabled:opacity-50",
        featured ? "text-amber-500" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Star
        className={cn("size-4", featured && "fill-amber-500")}
      />
    </button>
  );
}
