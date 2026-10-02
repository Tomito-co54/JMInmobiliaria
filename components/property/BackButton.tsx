"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { hasInAppHistory } from "@/lib/navigation/in-app-history";
import { cn } from "@/lib/utils";

/**
 * "Volver" on a listing: back to where the visitor was — the filtered
 * catalog, a building, the home — with its search and scroll intact. With no
 * page of the site behind it (arrived from a shared link, or reloaded) it is
 * a link to the catalog, never a step off the site.
 */
export function BackButton() {
  const router = useRouter();
  return (
    <Link
      href="/propiedades"
      aria-label="Volver"
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        if (!hasInAppHistory()) return;
        e.preventDefault();
        router.back();
      }}
      className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 gap-1.5")}
    >
      <ArrowLeft className="size-4" />
      <span className="hidden sm:inline">Volver</span>
    </Link>
  );
}
