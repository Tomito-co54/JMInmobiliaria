"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { usePrefersReducedMotion } from "@/hooks/use-in-view";

/**
 * Light/dark switch.
 *
 * The app's default is `system`, and that stays the starting point — this
 * only overrides it once someone actually asks. It flips against
 * `resolvedTheme` (what is on screen right now) rather than `theme` (which
 * reads "system"), so the first click always does the visible thing instead
 * of appearing to do nothing when the system preference already matches.
 *
 * Nothing renders until mount: the server has no idea which theme the
 * browser will resolve to, so drawing an icon before then guarantees a
 * hydration mismatch and a flash of the wrong one. The placeholder keeps the
 * header from reflowing when the real button arrives.
 *
 * The change itself is wiped in as a circle growing from this button (see
 * `theme-sweep` in globals.css). Progressive enhancement, in the strict
 * sense: where `startViewTransition` is missing the theme still changes, in
 * exactly the single frame it always did. Nothing depends on the animation.
 */

/**
 * `startViewTransition` is not in every browser, and typing it locally keeps
 * the call honest without reaching for `any`.
 */
interface ViewTransitionHandle {
  finished: Promise<void>;
  ready: Promise<void>;
  updateCallbackDone: Promise<void>;
}

type DocumentWithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => ViewTransitionHandle;
};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  function switchTheme(event: React.MouseEvent<HTMLButtonElement>) {
    const next = isDark ? "light" : "dark";
    const doc = document as DocumentWithViewTransition;

    if (reducedMotion || typeof doc.startViewTransition !== "function") {
      setTheme(next);
      return;
    }

    // The circle grows from the button, so the wipe starts where the finger
    // did. Radius reaches the farthest corner — anything less leaves a ring
    // of the old theme in the corner it never got to.
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    const root = document.documentElement;
    root.style.setProperty("--theme-origin-x", `${x}px`);
    root.style.setProperty("--theme-origin-y", `${y}px`);
    root.style.setProperty("--theme-radius", `${radius}px`);
    root.classList.add("theme-switching");

    // flushSync, because the callback has to leave the DOM already in its new
    // state — the API snapshots before and after it, and a React update that
    // is still queued would be captured as "no change" and the wipe would
    // reveal the theme it started from.
    const transition = doc.startViewTransition(() => {
      flushSync(() => setTheme(next));
    });

    // Every one of these promises REJECTS when the transition is aborted, and
    // aborts are ordinary: the tab goes to the background mid-click, the DOM
    // update misses the deadline, another transition starts. Observed both
    // here — `InvalidStateError` and `TimeoutError` — while testing.
    //
    // They have to be handled, not just awaited. `.finally()` re-throws, so it
    // left an unhandled rejection in the console on every abort, and in
    // production that is a stream of Sentry noise for something that is not a
    // failure: the theme has already changed by then. `then(done, done)` runs
    // the cleanup on both paths and settles.
    const done = () => root.classList.remove("theme-switching");
    transition.finished.then(done, done);
    transition.ready.catch(() => {});
    transition.updateCallbackDone.catch(() => {});
  }

  if (!mounted) {
    return <div className="size-9" aria-hidden="true" />;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      // The icon stays 32px to match the rest of the header, but the tap
      // target has to clear 44px. An invisible overlay does that without
      // changing the layout — growing the button itself would leave it
      // looming over its neighbours.
      className="relative after:absolute after:-inset-1.5 after:content-['']"
      onClick={switchTheme}
      // The label names the destination, not the current state: a screen
      // reader user needs to know what pressing it will do.
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={isDark ? "Modo claro" : "Modo oscuro"}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
