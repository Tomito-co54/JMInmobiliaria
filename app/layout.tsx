import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "opsz"],
});

/**
 * El título y la descripción que hereda toda página que no traiga los suyos —
 * o sea la pestaña del navegador, el resultado de Google y la vista previa de
 * cualquier link que se comparta.
 *
 * Decía "Plataforma Inmobiliaria" y ofrecía "scoring transparente para
 * compradores". Las tres cosas eran del portal agregador del upstream: esto
 * no es una plataforma sino la web de una inmobiliaria, el visitante no es
 * "un comprador" de un catálogo ajeno sino alguien mirando nuestras
 * propiedades, y el scoring dejó de mostrarse en público en la Fase 29 — o
 * sea que era una promesa que la página ya no cumplía.
 */
export const metadata: Metadata = {
  title: "Jotaeme — Inmobiliaria en Zona Sur",
  description:
    "Propiedades en venta y alquiler en Lanús, Banfield, Lomas de Zamora y Temperley. Publicamos los papeles, no solo las fotos: cada propiedad sale con su partida y su parcela.",
};

/**
 * Status bar / browser chrome color. Mobile browsers paint the top bar
 * (signal, time) with these values, matching the page's actual background.
 *
 * Two entries: the browser picks the one that matches the user's current
 * system color scheme, so light and dark mode stay visually coherent up
 * to the OS edge.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#1A1B5C" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${inter.variable} ${fraunces.variable}`}
    >
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
