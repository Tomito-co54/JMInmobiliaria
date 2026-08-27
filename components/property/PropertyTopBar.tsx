import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { ShareButton } from "./ShareButton";
import { cn } from "@/lib/utils";

/**
 * Sticky top bar of the public property page.
 *
 *   ← Volver        [isotipo Jotaeme]        [☾ tema] [⤴ Compartir]
 *
 * Server Component. The only action is Share (functional via the Web Share
 * API / clipboard fallback). The old decorative "Guardar (próximamente)"
 * stub was removed — favoriting is a logged-in buyer feature that already
 * lives in the data panel; it added nothing for an anonymous visitor.
 */
export function PropertyTopBar({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
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

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <ShareButton title={title} />
        </div>
      </div>
    </header>
  );
}
