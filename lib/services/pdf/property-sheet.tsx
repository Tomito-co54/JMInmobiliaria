import "server-only";
import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { theme } from "./theme";
import { labelWithOperation } from "@/lib/property/price";

/**
 * Ficha de propiedad — the one-pager a buyer downloads and shares.
 *
 * A property listing is looked at on a phone and then discussed somewhere
 * else: forwarded to a partner, printed for a visit, taken to a meeting with
 * an escribano. Until now the only way to carry the listing was a URL, which
 * loses everything the moment there is no signal.
 *
 * Deliberately not the paid ARBA report (`arba-report.tsx`): this carries
 * what is already public on /p/[id] and nothing more. The cadastral block is
 * here because it is on the page, not as a substitute for the informe.
 *
 * One A4 page on purpose. Two would need a photo grid, and a sheet that
 * takes ten seconds to render is one nobody waits for.
 */

const s = StyleSheet.create({
  page: {
    padding: theme.sizes.margin,
    fontFamily: theme.fonts.body,
    fontSize: theme.sizes.body,
    color: theme.colors.ink,
  },
  eyebrow: {
    fontSize: theme.sizes.small,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: theme.colors.gold,
  },
  address: {
    fontFamily: theme.fonts.heading,
    fontSize: theme.sizes.title,
    color: theme.colors.navy,
    marginTop: 4,
  },
  partido: { fontSize: theme.sizes.subtitle, color: theme.colors.inkSoft, marginTop: 2 },

  cover: { width: "100%", height: 210, objectFit: "cover", marginTop: 14, borderRadius: 4 },

  priceRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  price: { fontFamily: theme.fonts.heading, fontSize: 26, color: theme.colors.navy },

  specs: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
    paddingTop: 10,
  },
  spec: { width: "25%", marginBottom: 8 },
  specLabel: {
    fontSize: theme.sizes.small,
    color: theme.colors.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  specValue: { fontSize: 12, color: theme.colors.ink, marginTop: 2 },

  sectionTitle: {
    fontFamily: theme.fonts.heading,
    fontSize: theme.sizes.subtitle,
    color: theme.colors.navy,
    marginTop: 16,
    marginBottom: 6,
  },
  cadastral: { backgroundColor: theme.colors.cardBg, borderRadius: 4, padding: 10 },
  row: { flexDirection: "row", marginBottom: 3 },
  rowLabel: { width: 150, fontSize: theme.sizes.label, color: theme.colors.inkSoft },
  rowValue: { flex: 1, fontSize: theme.sizes.label, color: theme.colors.ink },
  note: { fontSize: theme.sizes.small, color: theme.colors.inkMuted, marginTop: 6 },

  description: { fontSize: theme.sizes.body, lineHeight: 1.5, color: theme.colors.ink },

  footer: {
    position: "absolute",
    bottom: theme.sizes.margin - 12,
    left: theme.sizes.margin,
    right: theme.sizes.margin,
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: theme.sizes.small, color: theme.colors.inkMuted },
  footerBrand: { fontSize: theme.sizes.small, color: theme.colors.navy },
});

export interface PropertySheetInput {
  generatedAt: string;
  url: string;
  whatsappDisplay: string;
  property: {
    address: string | null;
    partido: string | null;
    property_type: string | null;
    operation_type: string | null;
    price_amount: number | null;
    price_currency: string | null;
    surface_total: number | null;
    surface_covered: number | null;
    surface_arba: number | null;
    rooms: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    garages: number | null;
    partida: string | null;
    nomenclatura_catastral: string | null;
    description: string | null;
    /** Absolute URL. Omitted when the listing has no photo or it failed. */
    coverUrl: string | null;
  };
}

/**
 * The sheet is downloaded and forwarded, so it is read with none of the page
 * around it. A rent printed without its period is the one number on it that
 * can be misread as an entire purchase price.
 */
/**
 * The sheet is downloaded and forwarded, so it is read with none of the page
 * around it — but it does carry its own type line, and that line names the
 * operation ("Casa en alquiler"). So the number stays clean here for the same
 * reason it does on a card.
 */
function money(amount: number | null, currency: string | null): string {
  if (amount === null || !currency) return "Consultar";
  const n = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(amount);
  return currency === "USD" ? `USD ${n}` : `$ ${n}`;
}

const m2 = (v: number | null) => (v === null || v === undefined ? "—" : `${v} m²`);
const num = (v: number | null) => (v === null || v === undefined ? "—" : String(v));

/** Long descriptions would push the sheet onto a second page. */
function trim(text: string | null, max = 900): string | null {
  if (!text) return null;
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

export function PropertySheetDocument({ data }: { data: PropertySheetInput }) {
  const p = data.property;
  // "Casa en alquiler" rather than "casa · alquiler": this is the line that
  // has to carry the operation now that the price does not.
  const typeLine =
    labelWithOperation(
      p.property_type ? p.property_type[0].toUpperCase() + p.property_type.slice(1) : null,
      p.operation_type as "venta" | "alquiler" | null,
    ) ?? "";
  const description = trim(p.description);

  return (
    <Document
      title={p.address ?? "Ficha de propiedad"}
      author="Jotaeme — Oportunidades Inmobiliarias"
    >
      <Page size="A4" style={s.page}>
        {typeLine && <Text style={s.eyebrow}>{typeLine}</Text>}
        <Text style={s.address}>{p.address ?? "Propiedad"}</Text>
        {p.partido && <Text style={s.partido}>{p.partido}</Text>}

        {/* eslint-disable-next-line jsx-a11y/alt-text -- this is
            @react-pdf/renderer's Image, which draws into a PDF and has no
            alt prop; the rule is matching on the component name. */}
        {p.coverUrl && <Image style={s.cover} src={p.coverUrl} />}

        <View style={s.priceRow}>
          <Text style={s.price}>{money(p.price_amount, p.price_currency)}</Text>
        </View>

        <View style={s.specs}>
          {[
            ["Ambientes", num(p.rooms)],
            ["Dormitorios", num(p.bedrooms)],
            ["Baños", num(p.bathrooms)],
            ["Cocheras", num(p.garages)],
            ["Superficie total", m2(p.surface_total)],
            ["Superficie cubierta", m2(p.surface_covered)],
          ].map(([label, value]) => (
            <View key={label} style={s.spec}>
              <Text style={s.specLabel}>{label}</Text>
              <Text style={s.specValue}>{value}</Text>
            </View>
          ))}
        </View>

        {(p.partida || p.nomenclatura_catastral || p.surface_arba !== null) && (
          <>
            <Text style={s.sectionTitle}>Datos catastrales</Text>
            <View style={s.cadastral}>
              {p.partida && (
                <View style={s.row}>
                  <Text style={s.rowLabel}>Partida inmobiliaria</Text>
                  <Text style={s.rowValue}>{p.partida}</Text>
                </View>
              )}
              {p.nomenclatura_catastral && (
                <View style={s.row}>
                  <Text style={s.rowLabel}>Nomenclatura catastral</Text>
                  <Text style={s.rowValue}>{p.nomenclatura_catastral}</Text>
                </View>
              )}
              {p.surface_arba !== null && (
                <View style={s.row}>
                  <Text style={s.rowLabel}>Superficie de la parcela</Text>
                  <Text style={s.rowValue}>{m2(p.surface_arba)}</Text>
                </View>
              )}
              {/* The same distinction the property page makes: a unit is not
                  its parcel, and a reader comparing the two numbers without
                  this line would read a contradiction. */}
              {p.surface_arba !== null && (
                <Text style={s.note}>
                  Datos verificados contra ARBA. En departamentos y PH la parcela
                  corresponde al edificio entero, no a la unidad.
                </Text>
              )}
            </View>
          </>
        )}

        {description && (
          <>
            <Text style={s.sectionTitle}>Descripción</Text>
            <Text style={s.description}>{description}</Text>
          </>
        )}

        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {data.whatsappDisplay} · {data.url}
          </Text>
          <Text style={s.footerBrand}>
            Jotaeme — Oportunidades Inmobiliarias · {data.generatedAt}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
