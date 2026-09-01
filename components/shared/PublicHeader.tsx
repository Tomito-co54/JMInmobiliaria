import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { ThemeToggle } from "@/components/shared/theme-toggle";

/**
 * The public header, in one place.
 *
 * It was written inline in the landing, and there are five more hand-rolled
 * headers around the app — which is why turning on dark mode meant editing six
 * of them (Fase 15). Splitting the catalog onto its own page would have made a
 * seventh, and this one has real navigation in it now, so it is extracted
 * instead: the nav is a list, and adding a destination is adding an entry.
 *
 * Async server component that reads its own session. The landing used to fetch
 * the user and the role purely to decide this button, which put an auth round
 * trip in a page that otherwise did not need one.
 */

const NAV = [
  { href: "/propiedades", label: "Propiedades" },
  { href: "/guia-de-compra", label: "Guía de compra" },
] as const;

export async function PublicHeader({
  /** Marks the current section so the visitor knows where they are. */
  active,
}: {
  active?: "propiedades" | "guia";
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The logged-in CTA used to send everyone to /dashboard, the buyer-facing
  // dashboard inherited from the upstream portal. For the broker that was a
  // dead end: nothing linked to /admin, so the only way in was typing the URL.
  const { data: profile } = user
    ? await supabase.from("users").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  const isAdmin = (profile as { role?: string } | null)?.role === "admin";

  const activeHref =
    active === "propiedades"
      ? "/propiedades"
      : active === "guia"
        ? "/guia-de-compra"
        : null;

  return (
    <header className="px-4 py-3 border-b">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
        <Link
          href="/"
          aria-label="Jotaeme — inicio"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <BrandLogo variant="isotipo" size={32} priority />
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {NAV.map((item) => {
            const current = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  // "Propiedades" is the one destination that must survive a
                  // 375px viewport: it is where the catalog lives now, and the
                  // landing no longer contains it.
                  item.href === "/guia-de-compra" && "hidden sm:inline-flex",
                  current && "text-foreground font-semibold",
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <ThemeToggle />
          {user && (
            <Link
              href={isAdmin ? "/admin" : "/dashboard"}
              className={buttonVariants({ size: "sm" })}
            >
              {isAdmin ? "Panel" : "Ir al dashboard"}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
