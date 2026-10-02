import Link from "next/link";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { ShareButton } from "./ShareButton";
import { BackButton } from "./BackButton";

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
        <BackButton />

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
