"use client";

import { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils";

/**
 * The acknowledgement a tapped link owes you while the next page is fetched.
 *
 * Measured on this site: clicking a nav link and getting the new page took
 * about 300ms locally, and nothing at all happened in between — the old page
 * just sat there. On a mid-range phone on 4G (§4, the device this is designed
 * for) that gap is longer, and a gap with no feedback is the specific moment a
 * site stops feeling alive: you tap, nothing answers, so you tap again.
 *
 * Deliberately not a skeleton screen. Next keeps the current page on screen
 * until the next one is ready, which is *better* than blanking to a skeleton
 * for a wait this short — so the thing missing was never the destination, it
 * was the answer to the tap. A bar that fills under the link you touched says
 * "heard you, working" without throwing away the page you can still read.
 *
 * Deliberately not a spinner either (§2.5): a spinner is the same component
 * every framework ships, and it says "waiting" without saying for what. This
 * is anchored to the exact link you touched.
 *
 * Must be rendered as a child of `next/link`'s `<Link>` — `useLinkStatus`
 * reads the pending state of the nearest one. Its parent needs `relative`.
 */
export function NavPending({ className }: { className?: string }) {
  const { pending } = useLinkStatus();

  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-1.5 bottom-0.5 h-[2px] origin-left rounded-full",
        "motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out",
        // Scale, not width: width animates layout, transform does not (§4).
        pending ? "scale-x-100" : "scale-x-0",
        className,
      )}
      style={{ backgroundColor: "var(--brand-gold)" }}
    />
  );
}
