"use client";

import Link from "next/link";
import { useState } from "react";
import { LayoutDashboard, Menu, X } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { buttonVariants } from "@/components/ui/button";
import { WhatsAppButton } from "@/components/property/WhatsAppButton";
import { GENERIC_LEAD_MESSAGE } from "@/lib/brand/contact";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
}

/**
 * The public nav on a phone: a button that slides the destinations in from
 * the side, as most apps do (Tomy, 24-sep-2026).
 *
 * Why it exists: at 375px the header row fits two links next to the match and
 * the theme toggle, so the guide and /servicios were simply unreachable from a
 * phone — where most visitors are. A drawer holds every destination at a
 * thumb-sized height instead of choosing which two survive.
 *
 * Below md only; from md the row shows the links inline, unchanged. The items
 * are numbered like the disciplines on /servicios, so the drawer reads as part
 * of the site rather than a library menu (§2.5). It closes on the tap that
 * navigates: the page behind is what the visitor asked for.
 */
export function MobileNav({
  items,
  activeHref,
  panel,
}: {
  items: readonly NavItem[];
  activeHref: string | null;
  /** The broker's way into /admin, when logged in. */
  panel: NavItem | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Abrir menú"
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-11 md:hidden")}
      >
        <Menu className="size-5" aria-hidden />
      </SheetTrigger>

      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-[82%] max-w-xs gap-0 motion-reduce:transition-none"
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <SheetTitle
            className="text-xs uppercase tracking-[0.2em] font-medium"
            style={{ color: "var(--brand-gold)" }}
          >
            Menú
          </SheetTitle>
          <SheetClose
            aria-label="Cerrar menú"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-11 -mr-2")}
          >
            <X className="size-5" aria-hidden />
          </SheetClose>
        </div>

        <nav aria-label="Secciones" className="flex flex-col px-2">
          {items.map((item, i) => {
            const current = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={current ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={cn(
                  "relative flex min-h-14 items-baseline gap-4 rounded-xl px-4 py-3",
                  "transition-colors hover:bg-muted/60 active:bg-muted",
                  current && "bg-muted/60",
                )}
              >
                {current && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
                    style={{ backgroundColor: "var(--brand-gold)" }}
                  />
                )}
                <span
                  aria-hidden
                  className="font-heading italic text-sm tabular-nums"
                  style={{ color: "var(--brand-gold)" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={cn("font-heading text-2xl leading-tight", current && "font-medium")}
                  style={{ color: "var(--brand-heading)" }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3 border-t px-5 py-5">
          {panel && (
            <Link
              href={panel.href}
              onClick={() => setOpen(false)}
              className={cn(buttonVariants({ variant: "outline" }), "h-11 w-full gap-2")}
            >
              <LayoutDashboard className="size-4" aria-hidden />
              {panel.label}
            </Link>
          )}
          <p className="text-sm text-muted-foreground">¿Una consulta? Escribinos.</p>
          <WhatsAppButton message={GENERIC_LEAD_MESSAGE} size="sm" className="h-11 w-full" />
        </div>
      </SheetContent>
    </Sheet>
  );
}
