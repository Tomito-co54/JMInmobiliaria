"use client";

import { useCallback, useEffect, useState } from "react";
import {
  EMPTY_MATCH_PREFERENCES,
  parseMatchPreferences,
  type MatchPreferences,
} from "@/lib/matching/preferences";

/**
 * The visitor's search preferences, kept in the browser.
 *
 * Storage is `sessionStorage`, not `localStorage`, and not the database:
 *
 *   - Not the database, because there is no account to hang it on. The whole
 *     point is a match that works for someone who never logs in.
 *   - `sessionStorage` because this is a visit, not a profile. It lives as
 *     long as the tab, follows the visitor from the home to a listing and
 *     back, and is gone when they close the browser. Nothing to consent to,
 *     nothing to clean up, no identifier that outlives the visit.
 *
 * The trade is real and worth naming: come back tomorrow and it is empty.
 * That is the right default for a preference someone gave in ten seconds
 * without being asked to commit to anything.
 */
const STORAGE_KEY = "jm.match-preferences.v1";

/**
 * Same-tab broadcast. The `storage` event only fires in *other* tabs, so
 * without this the builder on the home and the panel on a listing could hold
 * different answers while sitting in the same document.
 */
const SYNC_EVENT = "jm:match-preferences";

function read(): MatchPreferences {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_MATCH_PREFERENCES;
    return parseMatchPreferences(JSON.parse(raw));
  } catch {
    // Private mode, storage disabled, or a value someone hand-edited into
    // nonsense. An empty search is a working page; a thrown error is not.
    return EMPTY_MATCH_PREFERENCES;
  }
}

export interface UseMatchPreferences {
  preferences: MatchPreferences;
  setPreferences: (next: MatchPreferences) => void;
  clear: () => void;
  /**
   * False until the first client read completes. Server and first client
   * render both show the empty state, so hydration matches; components use
   * this to avoid flashing "no preferences yet" over preferences that are
   * about to arrive.
   */
  ready: boolean;
}

export function useMatchPreferences(): UseMatchPreferences {
  const [preferences, setState] = useState<MatchPreferences>(
    EMPTY_MATCH_PREFERENCES,
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(read());
    setReady(true);

    const sync = () => setState(read());
    window.addEventListener(SYNC_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SYNC_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const write = useCallback((next: MatchPreferences) => {
    setState(next);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage refused (private mode, quota). The preference still applies
      // for this page — it just will not survive the next navigation.
    }
    window.dispatchEvent(new Event(SYNC_EVENT));
  }, []);

  const clear = useCallback(() => {
    setState(EMPTY_MATCH_PREFERENCES);
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* nothing to undo */
    }
    window.dispatchEvent(new Event(SYNC_EVENT));
  }, []);

  return { preferences, setPreferences: write, clear, ready };
}
