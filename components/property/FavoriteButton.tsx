"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { toggleFavoriteAction } from "@/app/(app)/favoritos/actions";

/**
 * Optimistic favorite toggle. Reads its initial state from the server
 * (the page that renders this card already knows which properties are
 * favorited by the current user) and updates immediately on click.
 *
 * The server action does the actual upsert/delete; if it errors we
 * roll back the optimistic state.
 *
 * The wrapping <button> uses stopPropagation so clicks don't bubble up
 * into the parent card's <Link>.
 */

interface FavoriteButtonProps {
  propertyId: string;
  initialFavorited: boolean;
  /** Visual variant: card overlay (small) or full button. */
  variant?: "overlay" | "full";
  /** When true, the parent isn't logged in — render disabled state. */
  signedOut?: boolean;
}

export function FavoriteButton({
  propertyId,
  initialFavorited,
  variant = "overlay",
  signedOut = false,
}: FavoriteButtonProps) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, startTransition] = useTransition();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (signedOut) {
      toast.info("Iniciá sesión para guardar favoritos");
      return;
    }
    const prev = favorited;
    setFavorited(!prev);
    startTransition(async () => {
      const result = await toggleFavoriteAction(propertyId);
      if (!result.ok) {
        setFavorited(prev);
        toast.error(result.error);
      }
    });
  }

  if (variant === "overlay") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-label={favorited ? "Quitar de favoritos" : "Guardar como favorito"}
        aria-pressed={favorited}
        className={cn(
          "grid place-items-center rounded-full size-9 bg-background/80 backdrop-blur-sm border shadow-sm transition-colors hover:bg-background",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          favorited && "text-red-500",
        )}
      >
        <Heart className={cn("size-4", favorited && "fill-current")} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label={favorited ? "Quitar de favoritos" : "Guardar como favorito"}
      aria-pressed={favorited}
      className={cn(
        "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/60",
        favorited && "border-red-300 bg-red-50 text-red-700 hover:bg-red-100",
      )}
    >
      <Heart className={cn("size-4", favorited && "fill-current")} />
      {favorited ? "Guardado" : "Guardar"}
    </button>
  );
}
