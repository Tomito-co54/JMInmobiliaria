/**
 * The enter animation for admin pages.
 *
 * Same idea as the public one and deliberately quieter — this is a tool, not
 * a showcase. The panel is where the broker works every day, and a movement
 * that is a nice surprise on a landing becomes a tax when you cross it forty
 * times in an afternoon. So: 200ms against the public 380, no scale, and no
 * scroll reveals anywhere in here.
 *
 * It still earns its place. Admin pages swap between very different layouts —
 * a dashboard of metric cards, a filterable table, a map — and switching
 * those in a single frame reads as a page reload rather than as moving inside
 * one app.
 */
export default function AdminTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200 motion-safe:ease-out">
      {children}
    </div>
  );
}
