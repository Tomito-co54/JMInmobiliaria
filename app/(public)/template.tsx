/**
 * The enter animation every public page shares.
 *
 * `template.tsx` and not `layout.tsx` on purpose: a layout persists across
 * navigations, a template re-mounts on each one. Re-mounting is the whole
 * point — it is what gives the new page an entrance instead of a cut.
 *
 * The cut is what this fixes. Until Fase 23 the public face was one long
 * landing and there was barely anywhere to navigate to; splitting it into
 * /propiedades, /edificios and the listing turned movement between pages into
 * the main thing a visitor does, and each of those moves swapped the whole
 * screen in a single frame — the "corte seco" §2.4 rules out, repeated on
 * every click.
 *
 * Deliberately smaller than the reveals inside the pages. A page entrance is
 * the frame around the content, not the content: 320ms and 8px, against the
 * 850ms and 36px of a Reveal. Anything bigger and the transition becomes the
 * thing you notice, which is §2's governing rule failing — movement that
 * decorates instead of doing a job. Its job here is continuity.
 *
 * Not applied to the landing (`app/page.tsx`, outside this group) because the
 * hero already stages its own cascade on mount; a page-level fade under it
 * would be two entrances stacked on the same paint.
 *
 * `motion-safe:` guards the animation, and the element carries no opacity of
 * its own — with reduced motion this renders as a plain div and the page is
 * simply there.
 */
export default function PublicTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 motion-safe:ease-out">
      {children}
    </div>
  );
}
