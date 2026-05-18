"use client";

import { HelpCircle, ExternalLink } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getGlossaryTerm } from "@/lib/glossary";
import { cn } from "@/lib/utils";

/**
 * Tap-to-open glossary tooltip. Wraps any piece of UI text with a
 * plain-Spanish explanation pulled from `lib/glossary.ts`.
 *
 *   <TermDefinition term="partida">Partida 12345</TermDefinition>
 *
 * Renders the child plus a small (?) hint icon. On tap/click, opens a popover
 * with the definition + optional context.
 *
 * Mobile-first: we use Popover (click-to-open) instead of Tooltip
 * (hover-to-open) because touch devices don't have a hover state. Popover
 * works identically on mouse and touch.
 *
 * Falls back gracefully: if the term id isn't in the glossary, renders just
 * the children with no hint — better than a broken tooltip in production.
 */

interface TermDefinitionProps {
  term: string;
  children: React.ReactNode;
  className?: string;
  hideIcon?: boolean;
}

export function TermDefinition({ term, children, className, hideIcon }: TermDefinitionProps) {
  const entry = getGlossaryTerm(term);
  if (!entry) {
    return <span className={className}>{children}</span>;
  }

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "inline-flex items-center gap-1 cursor-help underline decoration-dotted decoration-muted-foreground/60 underline-offset-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm",
          className,
        )}
        aria-label={`Definición: ${entry.label}`}
      >
        <span>{children}</span>
        {!hideIcon && (
          <HelpCircle className="size-3.5 text-muted-foreground" aria-hidden />
        )}
      </PopoverTrigger>
      <PopoverContent className="max-w-sm space-y-2 text-sm" sideOffset={6}>
        <p className="font-semibold leading-tight">{entry.label}</p>
        <p className="text-muted-foreground leading-relaxed">{entry.definition}</p>
        {entry.context && (
          <p className="text-muted-foreground leading-relaxed text-xs border-t pt-2">
            {entry.context}
          </p>
        )}
        {entry.link && (
          <a
            href={entry.link.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {entry.link.label}
            <ExternalLink className="size-3" />
          </a>
        )}
      </PopoverContent>
    </Popover>
  );
}
