"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { ExtraKind } from "./extras";

/**
 * Which optional extras the visitor has switched on, per listing.
 *
 * Two islands on /p/[id] show the price — the data panel and the mobile bar —
 * and they are separate React trees, so a context cannot join them. A
 * module-level store can: both import this, both re-render on the same
 * toggle, and the price cannot say 88.000 in one place and 80.000 in the
 * other.
 *
 * In memory only. It is a choice made while looking at one listing, not a
 * preference to carry to the next one.
 */

const EMPTY: ReadonlySet<ExtraKind> = new Set();
const selections = new Map<string, ReadonlySet<ExtraKind>>();
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function toggleExtra(propertyId: string, kind: ExtraKind) {
  const current = selections.get(propertyId) ?? EMPTY;
  const next = new Set(current);
  if (next.has(kind)) next.delete(kind);
  else next.add(kind);
  selections.set(propertyId, next);
  emit();
}

export function useSelectedExtras(propertyId: string): ReadonlySet<ExtraKind> {
  const get = useCallback(() => selections.get(propertyId) ?? EMPTY, [propertyId]);
  return useSyncExternalStore(subscribe, get, () => EMPTY);
}
