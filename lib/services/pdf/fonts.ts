import "server-only";
import { Font } from "@react-pdf/renderer";
import path from "node:path";

/**
 * Registers Inter + Fraunces with @react-pdf/renderer.
 *
 * We resolve the woff files from @fontsource at build time so the PDF
 * stays self-contained — no runtime fetch from Google Fonts, no
 * font-flash, deterministic output across deploys.
 *
 * Idempotent: calling multiple times is fine, Font.register replaces.
 */

let registered = false;

export function ensureFontsRegistered(): void {
  if (registered) return;

  const fontDir = (pkg: string, file: string) =>
    path.join(process.cwd(), "node_modules", pkg, "files", file);

  Font.register({
    family: "Inter",
    fonts: [
      {
        src: fontDir("@fontsource/inter", "inter-latin-400-normal.woff"),
        fontWeight: 400,
      },
      {
        src: fontDir("@fontsource/inter", "inter-latin-700-normal.woff"),
        fontWeight: 700,
      },
    ],
  });

  Font.register({
    family: "Fraunces",
    fonts: [
      {
        src: fontDir("@fontsource/fraunces", "fraunces-latin-400-normal.woff"),
        fontWeight: 400,
      },
      {
        src: fontDir("@fontsource/fraunces", "fraunces-latin-700-normal.woff"),
        fontWeight: 700,
      },
    ],
  });

  // Disable react-pdf's default hyphenation — it breaks Spanish words.
  Font.registerHyphenationCallback((word) => [word]);

  registered = true;
}
