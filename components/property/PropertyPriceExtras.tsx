"use client";

import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice, type OperationType, type PriceCurrency } from "@/lib/property/price";
import {
  extraKindLabel,
  extraTitle,
  includedExtras,
  optionalExtras,
  priceWithExtras,
  readExtras,
} from "@/lib/property/extras";
import { toggleExtra, useSelectedExtras } from "@/lib/property/extras-selection";

/**
 * The price of a listing together with its extras — the two cannot be shown
 * apart, because an optional extra changes the number.
 *
 *   incluida → a fixed chip with a check, in the place the "Propiedad
 *              verificada" chip used to have on the page: a fact about the
 *              unit, not a control. Nothing to decide, so nothing to press.
 *   opcional → a toggle. Pressed, its delta joins the price above and the
 *              caption says what the number now includes. 44px tall
 *              (principle 1); the choice is made with a thumb.
 *
 * The selection lives in lib/property/extras-selection so the mobile bar,
 * which is a separate island, shows the same number.
 *
 * DIRECCION_DE_ARTE §2.2 — tap that reveals at once: the price answers the
 * toggle in the same frame, no sheet, no recalculation step.
 */

interface PriceProps {
  propertyId: string;
  baseAmount: number | null;
  currency: PriceCurrency | null;
  operation: OperationType | null;
  extras: unknown;
}

function useConfiguredPrice({ propertyId, baseAmount, extras }: PriceProps) {
  const list = readExtras(extras);
  const selected = useSelectedExtras(propertyId);
  return { list, selected, price: priceWithExtras(baseAmount, list, selected) };
}

export function PropertyPriceExtras(props: PriceProps) {
  const { list, selected, price } = useConfiguredPrice(props);
  const text = formatPrice(price.amount, props.currency, props.operation);
  const included = includedExtras(list);
  const optional = optionalExtras(list);
  const caption =
    price.selected.length > 0
      ? `con ${price.selected.map((e) => extraKindLabel(e.kind).toLowerCase()).join(" y ")}` +
        (price.hasUnpriced ? " · a consultar" : "")
      : null;

  return (
    <div className="space-y-4">
      <div>
        {text ? (
          <p className="font-heading text-3xl sm:text-4xl font-medium tracking-tight tabular-nums">
            {text}
          </p>
        ) : (
          <p className="text-2xl font-bold text-muted-foreground">Consultar precio</p>
        )}
        {caption && (
          <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
            {caption}
          </p>
        )}
      </div>

      {(included.length > 0 || optional.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {included.map((e) => (
            <span
              key={e.kind}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border bg-background/95 px-3 py-1.5 text-xs font-medium"
              style={{ borderColor: "color-mix(in srgb, var(--brand-gold) 35%, transparent)" }}
            >
              <Check className="size-3.5" style={{ color: "var(--brand-gold)" }} aria-hidden />
              {extraTitle(e)}
            </span>
          ))}
          {optional.map((e) => {
            const on = selected.has(e.kind);
            const delta =
              e.price_delta !== null
                ? `+ ${formatPrice(e.price_delta, props.currency, null)}`
                : "a consultar";
            return (
              <button
                key={e.kind}
                type="button"
                aria-pressed={on}
                onClick={() => toggleExtra(props.propertyId, e.kind)}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
                  on
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-muted",
                )}
              >
                {on ? <Check className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}
                <span>{extraTitle(e)}</span>
                <span className={cn("tabular-nums", on ? "opacity-90" : "text-muted-foreground")}>
                  {delta}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** The mobile bar's price: same store, same number, no controls. */
export function PropertyBarPrice(props: PriceProps) {
  const { price } = useConfiguredPrice(props);
  const text = formatPrice(price.amount, props.currency, props.operation);
  if (!text) return <p className="text-sm font-semibold text-muted-foreground">Consultar precio</p>;
  return (
    <p className="font-heading text-lg font-medium tabular-nums leading-none truncate">
      {text}
      {price.selected.length > 0 && (
        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
          con {price.selected.map((e) => extraKindLabel(e.kind).toLowerCase()).join(" y ")}
        </span>
      )}
    </p>
  );
}
