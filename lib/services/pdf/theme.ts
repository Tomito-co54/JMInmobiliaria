/**
 * Visual constants for PDF reports. Mirrors the brand lock (navy + gold)
 * and uses the same family names registered in fonts.ts.
 */
export const theme = {
  colors: {
    navy: "#1A1B5C",
    navyDark: "#0E0E3C",
    gold: "#D4A24C",
    ink: "#1A1A1A",
    inkSoft: "#5A5A5A",
    inkMuted: "#8A8A8A",
    line: "#E5E5E8",
    cardBg: "#F7F7FA",
    success: "#1E8A4C",
    warning: "#B08010",
    danger: "#A53030",
  },
  fonts: {
    body: "Inter",
    heading: "Fraunces",
  },
  sizes: {
    page: { width: 595, height: 842 } as const, // A4 in pt
    margin: 40,
    title: 22,
    subtitle: 14,
    body: 10,
    small: 8,
    label: 9,
  },
} as const;

export type Theme = typeof theme;
