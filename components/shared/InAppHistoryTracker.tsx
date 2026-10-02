"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { dropHistoryArrivalUnless, recordVisit } from "@/lib/navigation/in-app-history";

/**
 * Feeds the in-app trail (lib/navigation/in-app-history). Renders nothing.
 * A back/forward arrival is left for the page it landed on to consume.
 */
export function InAppHistoryTracker() {
  const pathname = usePathname();
  useEffect(() => {
    recordVisit(pathname);
    dropHistoryArrivalUnless(pathname);
  }, [pathname]);
  return null;
}
