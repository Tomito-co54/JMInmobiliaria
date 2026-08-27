"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

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
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

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
      onClick={() => setTheme(isDark ? "light" : "dark")}
      // The label names the destination, not the current state: a screen
      // reader user needs to know what pressing it will do.
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={isDark ? "Modo claro" : "Modo oscuro"}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
