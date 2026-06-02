import { Reveal } from "@/components/home/HomeGuaranteesClient";

/**
 * Editorial section wrapper for the detail page (rediseño /p/[id]). Replaces
 * the stacked-card pattern: a strong typographic heading (Fraunces eyebrow-
 * less title) over content that sits on the page background, revealed on
 * scroll (§2.4 transiciones suaves). The content reads like a document, not
 * a widget.
 */
export function EditorialSection({
  title,
  subtitle,
  children,
  delayMs = 0,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  delayMs?: number;
}) {
  return (
    <Reveal delayMs={delayMs}>
      <section className="space-y-4">
        <header className="space-y-1">
          <h2
            className="font-heading text-xl sm:text-2xl font-medium tracking-tight"
            style={{ color: "var(--brand-heading)" }}
          >
            {title}
          </h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </header>
        {children}
      </section>
    </Reveal>
  );
}
