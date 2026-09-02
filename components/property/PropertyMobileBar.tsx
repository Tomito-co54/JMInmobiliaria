import { FavoriteButton } from "./FavoriteButton";
import { WhatsAppButton } from "./WhatsAppButton";
import { formatPrice } from "@/lib/property/price";

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
  propertyId,
  isFavorited,
  signedOut,
}: {
  address: string | null;
  propertyId: string;
  priceAmount: number | null;
  priceCurrency: "USD" | "ARS" | null;
  operationType: "venta" | "alquiler" | null;
  isFavorited: boolean;
  signedOut: boolean;
}) {
  return (
    <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="min-w-0 flex-1">
          {formatPrice(priceAmount, priceCurrency, operationType, { compact: true }) ? (
            <p className="font-heading text-lg font-medium tabular-nums leading-none truncate">
              {formatPrice(priceAmount, priceCurrency, operationType, { compact: true })}
            </p>
          ) : (
            <p className="text-sm font-semibold text-muted-foreground">Consultar precio</p>
          )}
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
