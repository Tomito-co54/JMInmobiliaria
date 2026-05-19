import type { GlossaryEntry } from "@/lib/education/buying-process";

/**
 * Alphabetical glossary of key terms in the buying process. Uses
 * native <details>/<summary> for accordion behavior on mobile and
 * stays open by default on desktop wide enough.
 */
export function GlossarySection({ entries }: { entries: readonly GlossaryEntry[] }) {
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {entries.map((entry) => (
        <li key={entry.term}>
          <details className="group rounded-md border bg-card transition-colors hover:border-primary/30 open:border-primary/40">
            <summary className="cursor-pointer px-4 py-3 list-none flex items-center justify-between gap-3 select-none">
              <span
                className="font-bold font-heading text-sm"
                style={{ color: "var(--brand-heading)" }}
              >
                {entry.term}
              </span>
              <svg
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </summary>
            <div className="px-4 pb-4 pt-0">
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {entry.definition}
              </p>
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
