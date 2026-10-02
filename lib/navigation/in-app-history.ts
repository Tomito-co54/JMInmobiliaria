/**
 * Which pages this tab has walked through inside the site, so "Volver" can
 * mean "back to where I was" without ever walking the visitor off the site.
 *
 * The listing's "Volver" used to be a plain link to `/`. From a filtered
 * catalog that threw the search away: open a listing, tap Volver, land on the
 * home with everything reset (Tomy, 2-oct-2026). Going back in history keeps
 * the search — it is in the URL — and the scroll. But `history.back()` blind
 * is wrong the other way: a visitor who arrived from a WhatsApp link would be
 * sent back to WhatsApp. So the button needs to know whether the previous
 * entry is ours, and the browser does not say: `document.referrer` is frozen
 * at the first load and never moves on client-side navigation.
 *
 * Hence this trail, kept by a tracker in the root layout. It mirrors the
 * history stack from what it can see — a pathname change — and treats a move
 * to the entry just below the top as a pop. Pathnames only: the catalog
 * rewrites its query string in place (replaceState), which is not a new
 * entry. It lives in module memory, so a full reload starts it empty and the
 * button falls back to a link: the safe side.
 */

/** The next trail after the visitor lands on `path`. Pure. */
export function nextTrail(trail: readonly string[], path: string): string[] {
  if (trail[trail.length - 1] === path) return [...trail];
  if (trail.length >= 2 && trail[trail.length - 2] === path) return trail.slice(0, -1);
  return [...trail, path];
}

/** Whether the entry below the current one is a page of this site. */
export function canGoBackInApp(trail: readonly string[]): boolean {
  return trail.length >= 2;
}

let trail: string[] = [];

export function recordVisit(path: string): void {
  trail = nextTrail(trail, path);
}

export function hasInAppHistory(): boolean {
  return canGoBackInApp(trail);
}

/**
 * Whether the page being mounted was reached with back/forward rather than a
 * link. A page that keeps state the URL does not hold (the catalog: how far
 * down, how many cards drawn) restores it only then — reached by a link, the
 * same URL is a fresh visit and starts at the top.
 *
 * Tied to the URL the pop landed on, not to a render: `popstate` fires before
 * Next renders the restored page, and that page can mount a commit later than
 * the layout around it (it suspends while its segment is read back). The
 * tracker drops it when the visitor ends up on another page.
 */
let poppedTo: string | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    poppedTo = window.location.pathname + window.location.search;
  });
}

/**
 * Whether the URL on screen is the one the last back/forward landed on. Not
 * consumed on read: React mounts twice in development, and the second mount
 * has to see the same answer. The tracker drops it on the next page.
 */
export function arrivedByHistory(): boolean {
  return poppedTo === window.location.pathname + window.location.search;
}

export function dropHistoryArrivalUnless(pathname: string): void {
  if (poppedTo === null) return;
  const poppedPath = poppedTo.split("?")[0];
  if (poppedPath !== pathname) poppedTo = null;
}
