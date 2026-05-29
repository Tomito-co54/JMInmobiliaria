"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Scroll-reveal + animation primitives for the public home (Block 4 del
 * rediseño). All animations on that surface are scroll-triggered and must
 * respect prefers-reduced-motion (DIRECCION_DE_ARTE §4). These hooks are
 * the shared, dependency-free backbone — no framer-motion, just
 * IntersectionObserver + requestAnimationFrame, so the bundle stays light
 * ("Vaulk liviano"). Everything they drive is transform/opacity only.
 */

/** Reads the user's reduced-motion preference, reactively. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/**
 * Fires once (by default) when the element scrolls into view. Returns a ref
 * to attach and the current visibility. On servers / browsers without
 * IntersectionObserver it reports visible immediately so content is never
 * trapped behind an animation that can't run.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(options?: {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  const once = options?.once ?? true;
  const threshold = options?.threshold ?? 0.3;
  const rootMargin = options?.rootMargin ?? "0px 0px -10% 0px";

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) obs.disconnect();
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { threshold, rootMargin },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [once, threshold, rootMargin]);

  return { ref, inView };
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * One-shot count-up from 0 → target, kicked off when `active` flips true.
 * Reduced-motion users jump straight to the target.
 */
export function useCountUp(
  target: number,
  active: boolean,
  opts?: { durationMs?: number },
): number {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const durationMs = opts?.durationMs ?? 1100;

  useEffect(() => {
    if (!active) return;
    if (reduced) {
      setValue(target);
      return;
    }
    let startTs: number | null = null;
    const tick = (ts: number) => {
      if (startTs === null) startTs = ts;
      const t = Math.min(1, (ts - startTs) / durationMs);
      setValue(target * easeOutCubic(t));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else setValue(target);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, target, reduced, durationMs]);

  return value;
}

/**
 * Tweens from the previous value to a new target whenever `target` changes.
 * Unlike useCountUp this is for *reactive* numbers (e.g. a match score that
 * moves as the user toggles criteria) — it animates from wherever it was,
 * not from zero. Starts settled on the initial target (no entry tween).
 */
export function useAnimatedNumber(
  target: number,
  opts?: { durationMs?: number },
): number {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number | null>(null);
  const durationMs = opts?.durationMs ?? 450;

  useEffect(() => {
    if (reduced) {
      setValue(target);
      fromRef.current = target;
      return;
    }
    const from = fromRef.current;
    let startTs: number | null = null;
    const tick = (ts: number) => {
      if (startTs === null) startTs = ts;
      const t = Math.min(1, (ts - startTs) / durationMs);
      setValue(from + (target - from) * easeOutCubic(t));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setValue(target);
        fromRef.current = target;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, reduced, durationMs]);

  return value;
}
