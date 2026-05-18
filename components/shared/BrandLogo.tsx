import Image from "next/image";
import { BRAND_ASSETS } from "@/lib/brand/assets";
import { cn } from "@/lib/utils";

/**
 * Brand logo component with sensible defaults.
 *
 *   variant="isotipo"  — J+M mark only, for tight spots (sticky nav, footer chip)
 *   variant="full"     — full logo + tagline, for hero / footer / landing
 *
 *   tone="auto"        — navy in light theme, white in dark (default)
 *   tone="navy"        — force navy regardless of theme
 *   tone="white"       — force white regardless of theme
 *
 * The auto path renders both variants and hides one with Tailwind's `dark:`
 * variant. Two image requests, but it's the simplest way to theme-swap
 * raster/SVG assets without inlining the SVG path.
 *
 * `size` is a pixel value used for the longer dimension; the aspect ratio is
 * preserved automatically.
 */
interface BrandLogoProps {
  variant?: "isotipo" | "full";
  tone?: "auto" | "navy" | "white";
  size?: number;
  className?: string;
  priority?: boolean;
}

export function BrandLogo({
  variant = "isotipo",
  tone = "auto",
  size = 32,
  className,
  priority,
}: BrandLogoProps) {
  const alt = variant === "full" ? "Jotaeme — Oportunidades Inmobiliarias" : "Jotaeme";
  const aspectRatio = variant === "full" ? 3395 / 2540 : 3395 / 1590;
  const width = Math.round(size * aspectRatio);
  const height = size;

  const navySrc = variant === "full" ? BRAND_ASSETS.logoNavy : BRAND_ASSETS.isotipoNavy;
  const whiteSrc = variant === "full" ? BRAND_ASSETS.logoWhite : BRAND_ASSETS.isotipoWhite;

  if (tone === "navy") {
    return (
      <Image
        src={navySrc}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={cn("inline-block select-none", className)}
      />
    );
  }
  if (tone === "white") {
    return (
      <Image
        src={whiteSrc}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={cn("inline-block select-none", className)}
      />
    );
  }
  // auto: render both, hide one based on theme.
  return (
    <>
      <Image
        src={navySrc}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={cn("inline-block select-none dark:hidden", className)}
      />
      <Image
        src={whiteSrc}
        alt=""
        aria-hidden
        width={width}
        height={height}
        priority={priority}
        className={cn("hidden select-none dark:inline-block", className)}
      />
    </>
  );
}
