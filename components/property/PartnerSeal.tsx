import Image from "next/image";
import { cn } from "@/lib/utils";
import { colegaFor } from "@/lib/colegas";

/**
 * The small seal on a partner's listing: their logo, and nothing that links
 * to them (Tomy, 23-sep-2026). The contact is still Tomy's WhatsApp.
 *
 * A partner without a seal (lib/colegas: the family's own agency in Villa del
 * Dique, "sin sello") renders nothing here, so its listings read exactly like
 * the family's.
 *
 * A white frame keeps the logo legible on any photo, and the fixed height
 * keeps it a seal — the photo is the listing, the logo only says whose it is.
 */
export function PartnerSeal({
  partner,
  size = "sm",
  className,
}: {
  partner: string | null | undefined;
  size?: "sm" | "md";
  className?: string;
}) {
  const colega = colegaFor(partner);
  if (!colega?.seal) return null;
  const height = size === "sm" ? 24 : 32;
  const width = Math.round((height * colega.seal.width) / colega.seal.height);
  return (
    <span
      className={cn("inline-flex overflow-hidden rounded-md bg-white p-0.5 shadow-md ring-1 ring-black/5", className)}
      title={colega.name}
    >
      <Image
        src={colega.seal.logo}
        alt={colega.name}
        width={width}
        height={height}
        className="rounded-[0.3rem]"
        style={{ height, width }}
      />
    </span>
  );
}
