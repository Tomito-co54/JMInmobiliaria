"use client";

import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils";

/**
 * Content that arrives instead of appearing (§2.4 — nada corta en seco).
 *
 * It lived in `components/home/HomeGuaranteesClient` because the home is where
 * it was first needed, and then the catalog and the listing page imported it
 * from there — a shared primitive addressed through the file of one of its
 * callers. Same reason the catalog components left `home/` when the catalog
 * left the landing: the name has to survive the next caller.
 *
 * Deliberately not a library. It is one IntersectionObserver and a CSS
 * transition on transform/opacity — the two properties the compositor can
 * animate without touching layout — so it costs no bundle and no scroll jank
 * on the mid-range phone the project designs for (§4).
 *
 * `motion-safe:` on the hidden state and not just the transition is the part
 * that matters: with reduced motion the element never gets `opacity-0` in the
 * first place, so the content is *there*, not merely un-animated. An element
 * that starts invisible and relies on an animation to become visible is a
 * blank page for anyone whose animation does not run.
 */
export function Reveal({
  children,
  delayMs = 0,
  className,
  direction = "up",
  as = "div",
  ...rest
}: {
  children: React.ReactNode;
  delayMs?: number;
  className?: string;
  /** Entrance direction. "up" rises; "left"/"right" slide in horizontally. */
  direction?: "up" | "left" | "right";
  /**
   * The element to render. Defaults to a div; pass `"li"` inside a list.
   *
   * Not cosmetic: a `<div>` between `<ol>` and `<li>` is invalid markup and
   * silently costs the list its semantics, so a reader on a screen reader
   * stops being told how many stages there are and which one they are on —
   * on the page whose whole job is explaining a process in order.
   */
  as?: "div" | "li" | "section" | "article";
} & Omit<React.HTMLAttributes<HTMLElement>, "className" | "children">) {
  // Typed to the widest of the elements `as` allows, so the observer ref
  // fits whichever one is rendered.
  //
  // `threshold: 0` — fire when any part enters — and NOT the hook's default of
  // 0.3. A fraction-of-itself threshold is unsatisfiable for an element taller
  // than 1/0.3 viewports: it can never be 30% visible, so it never reveals and
  // the content is lost for good. Measured, not theorised: stage 4 of the
  // buying guide is 2510px against a 667px phone viewport — 3.7x — and
  // scrolling through the whole stage left it at `opacity: 0` the entire way.
  //
  // The bottom margin is what keeps the entrance from firing off-screen: the
  // element has to cross into the lower eighth of the viewport before it
  // counts as arrived. That is close to the old feel for anything short,
  // which is what the home was tuned against, and it is simply correct for
  // anything tall.
  const { ref, inView } = useInView<HTMLElement>({
    threshold: 0,
    rootMargin: "0px 0px -12% 0px",
  });
  // The union in `as` would otherwise make React intersect every element's
  // ref type, which nothing can satisfy. Widened here, not at the boundary:
  // the prop stays a closed list so callers still cannot pass anything.
  const Tag = as as React.ElementType;
  const hidden =
    direction === "left"
      ? "motion-safe:opacity-0 motion-safe:-translate-x-10 motion-safe:scale-[0.97]"
      : direction === "right"
        ? "motion-safe:opacity-0 motion-safe:translate-x-10 motion-safe:scale-[0.97]"
        : "motion-safe:opacity-0 motion-safe:translate-y-9 motion-safe:scale-[0.97]";
  return (
    <Tag
      ref={ref as React.Ref<HTMLElement>}
      {...rest}
      className={cn(
        "motion-safe:transition-all motion-safe:duration-[850ms]",
        inView ? "opacity-100 translate-x-0 translate-y-0 scale-100" : hidden,
        className,
      )}
      style={{
        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        transitionDelay: inView ? `${delayMs}ms` : "0ms",
      }}
    >
      {children}
    </Tag>
  );
}
