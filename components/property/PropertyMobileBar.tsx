import Link from "next/link";
import { FileText } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FavoriteButton } from "./FavoriteButton";

/**
 * Sticky bottom action bar — MOBILE ONLY (hidden lg:+). Keeps price + Save +
 * Servicios reachable without scrolling to the footer (§4: las animaciones
 * y el scroll nunca esconden los CTA). On desktop the sticky right panel
 * already covers this, so this is suppressed there.
 */

function fmtPrice(amount: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(amount);
}

export function PropertyMobileBar({
  propertyId,
  priceAmount,
  priceCurrency,
  isFavorited,
  signedOut,
}: {
  propertyId: string;
  priceAmount: number | null;
  priceCurrency: "USD" | "ARS" | null;
  isFavorited: boolean;
  signedOut: boolean;
}) {
  return (
    <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="min-w-0 flex-1">
          {priceAmount !== null && priceCurrency ? (
            <p className="font-heading text-lg font-medium tabular-nums leading-none truncate">
              {priceCurrency} {fmtPrice(priceAmount)}
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
        <Link
          href={`/p/${propertyId}/servicios`}
          className={cn(buttonVariants({ size: "sm" }), "h-10 gap-1.5 shrink-0")}
        >
          <FileText className="size-4" />
          Servicios
        </Link>
      </div>
    </div>
  );
}
