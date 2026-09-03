import { FavoriteButton } from "./FavoriteButton";
import { WhatsAppButton } from "./WhatsAppButton";
import { PropertyBarPrice } from "./PropertyPriceExtras";

/**
 * Sticky bottom action bar — MOBILE ONLY (hidden lg:+). Keeps price + Save +
 * the primary lead CTA (WhatsApp) reachable without scrolling to the footer
 * (§4: las animaciones y el scroll nunca esconden los CTA). On desktop the
 * sticky right panel already covers this, so this is suppressed there.
 */

export function PropertyMobileBar({
  address,
  priceAmount,
  priceCurrency,
  operationType,
  extras,
  propertyId,
  isFavorited,
  signedOut,
}: {
  address: string | null;
  propertyId: string;
  priceAmount: number | null;
  priceCurrency: "USD" | "ARS" | null;
  operationType: "venta" | "alquiler" | null;
  extras: unknown;
  isFavorited: boolean;
  signedOut: boolean;
}) {
  return (
    <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {/* Same store as the panel's toggles, so the bar cannot show
            80.000 while the panel says 88.000 con cochera. */}
        <div className="min-w-0 flex-1">
          <PropertyBarPrice
            propertyId={propertyId}
            baseAmount={priceAmount}
            currency={priceCurrency}
            operation={operationType}
            extras={extras}
          />
        </div>
        <FavoriteButton
          propertyId={propertyId}
          initialFavorited={isFavorited}
          variant="overlay"
          signedOut={signedOut}
        />
        <WhatsAppButton address={address} size="sm" className="shrink-0" />
      </div>
    </div>
  );
}
