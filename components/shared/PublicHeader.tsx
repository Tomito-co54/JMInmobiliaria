import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { MatchQuickFilter } from "@/components/matching/MatchQuickFilter";
import { NavPending } from "@/components/shared/NavPending";
import { getMatchableCatalog } from "@/lib/db/properties";

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
 *
 * It also carries the match now. The criteria used to sit at the foot of the
 * landing only, which meant a visitor who arrived at /propiedades — where the
 * catalog actually lives — could not reach them at all. The catalog it matches
 * against is fetched here and handed to the client island: four rows, the same
 * public gate as every other surface.
 */

const NAV = [
  { href: "/propiedades", label: "Propiedades" },
  { href: "/edificios", label: "Edificios" },
  { href: "/guia-de-compra", label: "Guía de compra" },
] as const;

export async function PublicHeader({
  /** Marks the current section so the visitor knows where they are. */
  active,
}: {
  active?: "propiedades" | "edificios" | "guia";
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const matchable = await getMatchableCatalog();

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
      : active === "edificios"
        ? "/edificios"
        : active === "guia"
          ? "/guia-de-compra"
          : null;

  return (
    <header className="px-4 py-3 border-b">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
        <Link
          href="/"
          aria-label="Jotaeme — inicio"
          // shrink-0: without it the flex row pays for a crowded nav by
          // squeezing the logo, and a clipped brand mark is the one thing in
          // this row that must never be what gives way.
          className="flex shrink-0 items-center gap-2 hover:opacity-80 transition-opacity"
        >
          {/* The isotipo is a wide mark: at 32px tall it is 68px across, the
              single widest thing in this row. Two thirds of that height at
              375px buys back the space the match needs without removing a
              destination or clipping the mark. */}
          <BrandLogo
            variant="isotipo"
            size={32}
            priority
            className="h-6 w-auto sm:h-8"
          />
        </Link>

        {/* gap-0.5 at 375px, measured, not guessed: logged in the row holds
            two catalog links, the match, the theme toggle and the Panel
            button, and at gap-1 that overflows by about ten pixels. */}
        <nav className="flex items-center gap-0.5 sm:gap-2">
          {NAV.map((item) => {
            const current = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  // relative: NavPending anchors its bar to this link.
                  "relative",
                  // Tighter than the default at 375px. Measured: anonymous,
                  // the row fits either way with room to spare. Logged in it
                  // does not — the "Panel" button lands the nav within a few
                  // pixels of the edge — and the broker is the one person who
                  // is always logged in.
                  "px-2 sm:px-3",
                  // Both catalog destinations stay visible at 375px. The
                  // landing no longer contains the catalog, so these are the
                  // only way to it, and hiding one on the viewport the project
                  // designs for first would make it unreachable exactly where
                  // most visitors are. They fit; the guide is the one that
                  // waits for a wider screen.
                  item.href === "/guia-de-compra" && "hidden sm:inline-flex",
                  current && "text-foreground font-semibold",
                )}
              >
                {item.label}
                <NavPending />
              </Link>
            );
          })}
          <MatchQuickFilter properties={matchable} compact={!!user} />
          <ThemeToggle />
          {user && (
            <Link
              href={isAdmin ? "/admin" : "/dashboard"}
              aria-label={isAdmin ? "Panel de administración" : "Ir al dashboard"}
              // Icon-only below sm. The word costs 25px in a row that has
              // none to spare once the match joins it, and this button exists
              // for one person on the one screen where the label is least
              // needed — they know what it is, they put it there.
              className={cn(buttonVariants({ size: "sm" }), "px-2.5 sm:px-3")}
            >
              <LayoutDashboard className="size-4 sm:hidden" aria-hidden />
              <span className="hidden sm:inline">
                {isAdmin ? "Panel" : "Ir al dashboard"}
              </span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
