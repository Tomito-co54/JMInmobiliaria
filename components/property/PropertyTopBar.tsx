import Link from "next/link";
import { ArrowLeft, Heart, Share2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { cn } from "@/lib/utils";

/**
 * Sticky top bar of the public property page.
 *
 *   ← Volver        [isotipo Jotaeme]        [♡] [⤴]
 *
 * Server Component — the save/share buttons are decorative for now (B6/B7
 * will wire them up). Rendering them as <Button> with disabled tooltip is
 * fine for the layout pass.
 */
export function PropertyTopBar() {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
        <Link
          href="/"
          aria-label="Volver al inicio"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2 gap-1.5",
          )}
        >
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">Volver</span>
        </Link>

        <Link href="/" aria-label="Jotaeme — Oportunidades Inmobiliarias" className="shrink-0">
          <BrandLogo variant="isotipo" size={28} />
        </Link>

        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" aria-label="Guardar (próximamente)">
            <Heart className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Compartir (próximamente)">
            <Share2 className="size-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
