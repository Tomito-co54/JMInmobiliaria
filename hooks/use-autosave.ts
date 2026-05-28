"use client";

import { useEffect, useRef, useState } from "react";

export type AutoSaveStatus =
  | "idle" // nothing to save (clean)
  | "dirty" // user typed something, debounce running
  | "saving" // request in flight
  | "saved" // just saved, fades back to idle
  | "error"; // last save failed

export interface AutoSaveResult {
  status: AutoSaveStatus;
  lastSavedAt: number | null;
  lastError: string | null;
  /** Trigger a save right now, skipping the debounce. Useful for onBlur. */
  flush: () => void;
}

/**
 * Debounced autosave hook.
 *
 * Watches `values` (a snapshot of the section's form state) and, after
 * `debounceMs` of no further changes, invokes `save()`. If `save()`
 * resolves the status flips to "saved" briefly; if it throws, the
 * status flips to "error" and the error message is exposed.
 *
 *   - First mount is NOT considered dirty (values match the DB snapshot
 *     the parent loaded).
 *   - Every value change resets the debounce timer.
 *   - In-flight saves don't block subsequent saves — the latest values
 *     are always picked up on the next debounced fire.
 *
 * The hook serializes `values` with JSON.stringify to compare snapshots,
 * which is fine for the small flat objects each section uses.
 *
 * `save` is captured via a ref so the parent can freely rebuild the
 * closure on every render without re-triggering the effect.
 */
export function useAutoSave<T>(
  values: T,
  save: () => Promise<void>,
  debounceMs = 800,
): AutoSaveResult {
  const saveRef = useRef(save);
  saveRef.current = save;

  const lastSavedSnapshotRef = useRef(JSON.stringify(values));
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFadeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [status, setStatus] = useState<AutoSaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const triggerSave = useRef(async () => {
    setStatus("saving");
    try {
      await saveRef.current();
      lastSavedSnapshotRef.current = JSON.stringify(values);
      setStatus("saved");
      setLastSavedAt(Date.now());
      setLastError(null);
      // Fade back to idle after a short pause so the indicator settles.
      if (savedFadeoutRef.current) clearTimeout(savedFadeoutRef.current);
      savedFadeoutRef.current = setTimeout(() => setStatus("idle"), 1500);
    } catch (err) {
      setStatus("error");
      setLastError(err instanceof Error ? err.message : "Error al guardar");
    }
  });

  // Keep the triggerSave closure looking at the latest values snapshot.
  // We capture `values` here intentionally; the closure runs at save time
  // so the snapshot persisted into `lastSavedSnapshotRef` matches what
  // was sent.
  triggerSave.current = async () => {
    const snapshot = JSON.stringify(values);
    setStatus("saving");
    try {
      await saveRef.current();
      lastSavedSnapshotRef.current = snapshot;
      setStatus("saved");
      setLastSavedAt(Date.now());
      setLastError(null);
      if (savedFadeoutRef.current) clearTimeout(savedFadeoutRef.current);
      savedFadeoutRef.current = setTimeout(() => setStatus("idle"), 1500);
    } catch (err) {
      setStatus("error");
      setLastError(err instanceof Error ? err.message : "Error al guardar");
    }
  };

  useEffect(() => {
    const current = JSON.stringify(values);
    if (current === lastSavedSnapshotRef.current) {
      // No drift — don't queue a save.
      return;
    }
    setStatus("dirty");

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      triggerSave.current();
    }, debounceMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // We intentionally only depend on the stringified values + debounceMs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(values), debounceMs]);

  // Clean up the saved-fadeout timer on unmount.
  useEffect(() => {
    return () => {
      if (savedFadeoutRef.current) clearTimeout(savedFadeoutRef.current);
    };
  }, []);

  return {
    status,
    lastSavedAt,
    lastError,
    flush: () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      triggerSave.current();
    },
  };
}
