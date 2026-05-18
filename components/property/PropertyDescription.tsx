"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Description block with "ver más / ver menos" toggle.
 *
 * Descriptions in our DB average 806 chars (some run >4k chars with
 * agency boilerplate). Showing the full text by default would push the
 * map below the fold on every property. We collapse at ~450 chars and let
 * the user expand on demand.
 *
 * Why a Client Component: a single piece of state (expanded boolean).
 * Couldn't easily do this with pure server-side + URL params without
 * killing scroll position on toggle.
 */

const COLLAPSED_LIMIT = 450;

interface PropertyDescriptionProps {
  description: string | null;
}

export function PropertyDescription({ description }: PropertyDescriptionProps) {
  const [expanded, setExpanded] = useState(false);
  const text = (description ?? "").trim();
  const isLong = text.length > COLLAPSED_LIMIT;
  const visible = expanded || !isLong ? text : text.slice(0, COLLAPSED_LIMIT) + "…";

  return (
    <section className="rounded-lg border bg-card p-5 sm:p-6 space-y-3">
      <h2 className="font-semibold text-base">Descripción</h2>
      {text.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          El aviso no incluyó descripción.
        </p>
      ) : (
        <>
          <p className="text-sm text-foreground/85 whitespace-pre-wrap leading-relaxed">
            {visible}
          </p>
          {isLong && (
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? (
                <>
                  <ChevronUp className="size-4" />
                  Ver menos
                </>
              ) : (
                <>
                  <ChevronDown className="size-4" />
                  Ver más
                </>
              )}
            </Button>
          )}
        </>
      )}
    </section>
  );
}
