import "server-only";
import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Svg,
  Polygon,
  Path,
} from "@react-pdf/renderer";
import { theme } from "./theme";
import { extractRings, getBoundingBox, projectRing } from "./geometry";

/**
 * Informe Catastral ARBA — PDF document.
 *
 * One A4 page (portrait) with:
 *   1. Brand header (logo SVG path-traced + slogan)
 *   2. Title + folio + fecha
 *   3. Datos de la propiedad (address, partido)
 *   4. Datos catastrales ARBA (partida, nomenclatura, sup, tipo)
 *   5. Polígono catastral (SVG render)
 *   6. Comparación superficie declarada vs ARBA (if both available)
 *   7. Footer: disclaimer legal
 *
 * Input is the resolved order data; this component does no I/O. The
 * caller (fulfillment) fetches property + arba_lookup + the order row
 * and passes them in.
 */

export interface ArbaReportInput {
  /** Order id, used as folio. */
  orderId: string;
  /** When the report was generated, ISO date. */
  generatedAt: string;
  property: {
    address: string | null;
    partido: string | null;
    surface_total: number | null;
    surface_covered: number | null;
    property_type: string | null;
  };
  arba: {
    partida: string | null;
    nomenclatura: string | null;
    surface_arba: number | null;
    tipo: string | null;
    geometry: unknown; // GeoJSON Polygon or MultiPolygon
  };
}

const styles = StyleSheet.create({
  page: {
    paddingTop: theme.sizes.margin,
    paddingHorizontal: theme.sizes.margin,
    paddingBottom: theme.sizes.margin,
    fontFamily: theme.fonts.body,
    fontSize: theme.sizes.body,
    color: theme.colors.ink,
    backgroundColor: "#FFFFFF",
  },

  /* Header */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.navy,
    paddingBottom: 12,
    marginBottom: 20,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandText: {
    flexDirection: "column",
  },
  brandName: {
    fontFamily: theme.fonts.heading,
    fontSize: 18,
    fontWeight: 700,
    color: theme.colors.navy,
  },
  brandSlogan: {
    fontSize: 7,
    color: theme.colors.gold,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginTop: 1,
  },
  folioBox: { alignItems: "flex-end" },
  folioLabel: {
    fontSize: 7,
    color: theme.colors.inkMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  folioValue: {
    fontSize: 9,
    fontFamily: "Inter",
    color: theme.colors.ink,
  },

  /* Title */
  title: {
    fontFamily: theme.fonts.heading,
    fontSize: theme.sizes.title,
    fontWeight: 700,
    color: theme.colors.navy,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: theme.sizes.body,
    color: theme.colors.inkSoft,
    marginBottom: 16,
  },

  /* Section */
  section: { marginBottom: 12 },
  sectionTitle: {
    fontFamily: theme.fonts.heading,
    fontSize: theme.sizes.subtitle,
    fontWeight: 700,
    color: theme.colors.navy,
    marginBottom: 6,
  },

  /* Data card */
  card: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 6,
    padding: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  field: { width: "48%", marginBottom: 4 },
  fieldFull: { width: "100%", marginBottom: 4 },
  fieldLabel: {
    fontSize: theme.sizes.small,
    color: theme.colors.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  fieldValue: { fontSize: theme.sizes.body, color: theme.colors.ink },
  fieldValueMono: {
    fontSize: theme.sizes.body,
    color: theme.colors.ink,
    fontFamily: "Inter",
  },

  /* Polygon */
  polygonContainer: {
    alignSelf: "center",
    width: 280,
    height: 150,
    backgroundColor: theme.colors.cardBg,
    borderRadius: 6,
    padding: 6,
  },

  /* Comparison */
  comparisonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  comparisonRowLast: { borderBottomWidth: 0 },
  comparisonLabel: { color: theme.colors.inkSoft },
  comparisonValue: { color: theme.colors.ink, fontWeight: 700 },
  comparisonDeltaOk: { color: theme.colors.success, fontSize: theme.sizes.small },
  comparisonDeltaWarn: { color: theme.colors.warning, fontSize: theme.sizes.small },
  comparisonDeltaBad: { color: theme.colors.danger, fontSize: theme.sizes.small },

  /* Footer */
  footer: {
    position: "absolute",
    bottom: theme.sizes.margin,
    left: theme.sizes.margin,
    right: theme.sizes.margin,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
  },
  footerText: {
    fontSize: 7,
    color: theme.colors.inkMuted,
    lineHeight: 1.4,
    textAlign: "justify",
  },
  footerBrand: {
    fontSize: 7,
    color: theme.colors.navy,
    fontFamily: theme.fonts.heading,
    fontWeight: 700,
    marginTop: 4,
  },
});

function fmt(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function fmtSurface(v: number | null): string {
  if (v === null) return "—";
  return `${v.toLocaleString("es-AR", { maximumFractionDigits: 2 })} m²`;
}

function classifyDelta(declared: number, arba: number): {
  pct: number;
  label: "OK" | "Tolerable" | "Discrepancia";
  style: "ok" | "warn" | "bad";
} {
  const pct = ((declared - arba) / arba) * 100;
  const abs = Math.abs(pct);
  if (abs <= 5) return { pct, label: "OK", style: "ok" };
  if (abs <= 20) return { pct, label: "Tolerable", style: "warn" };
  return { pct, label: "Discrepancia", style: "bad" };
}

function PolygonView({ geometry }: { geometry: unknown }) {
  const rings = extractRings(geometry);
  const bbox = getBoundingBox(rings);
  if (!bbox) {
    return (
      <View style={styles.polygonContainer}>
        <Text style={{ fontSize: 8, color: theme.colors.inkMuted, textAlign: "center", marginTop: 60 }}>
          (sin polígono disponible)
        </Text>
      </View>
    );
  }
  const viewport = { width: 268, height: 138, padding: 4 };
  return (
    <View style={styles.polygonContainer}>
      <Svg width={viewport.width} height={viewport.height} viewBox={`0 0 ${viewport.width} ${viewport.height}`}>
        {/* Background grid (subtle) */}
        <Path
          d={`M 0 ${viewport.height / 2} L ${viewport.width} ${viewport.height / 2} M ${viewport.width / 2} 0 L ${viewport.width / 2} ${viewport.height}`}
          stroke={theme.colors.line}
          strokeWidth={0.4}
        />
        {rings.map((ring, i) => {
          const pts = projectRing(ring, bbox, viewport);
          const pointsStr = pts.map((p) => `${p.x},${p.y}`).join(" ");
          return (
            <Polygon
              key={i}
              points={pointsStr}
              fill={theme.colors.navy}
              fillOpacity={0.18}
              stroke={theme.colors.navy}
              strokeWidth={1.2}
            />
          );
        })}
      </Svg>
    </View>
  );
}

export function ArbaReportDocument({ data }: { data: ArbaReportInput }) {
  const fecha = new Date(data.generatedAt).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const folio = data.orderId.split("-")[0].toUpperCase();

  const hasComparison =
    data.property.surface_total !== null && data.arba.surface_arba !== null;
  const delta = hasComparison
    ? classifyDelta(
        Number(data.property.surface_total),
        Number(data.arba.surface_arba),
      )
    : null;

  return (
    <Document
      title={`Informe Catastral ARBA — ${folio}`}
      author="Jotaeme"
      subject="Informe catastral oficial ARBA"
      creator="Jotaeme"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brand}>
            <View style={styles.brandText}>
              <Text style={styles.brandName}>Jotaeme</Text>
              <Text style={styles.brandSlogan}>Oportunidades Inmobiliarias</Text>
            </View>
          </View>
          <View style={styles.folioBox}>
            <Text style={styles.folioLabel}>Folio</Text>
            <Text style={styles.folioValue}>{folio}</Text>
            <Text style={[styles.folioLabel, { marginTop: 4 }]}>Emitido</Text>
            <Text style={styles.folioValue}>{fecha}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Informe Catastral ARBA</Text>
        <Text style={styles.subtitle}>
          Datos oficiales registrados en la Agencia de Recaudación de la Provincia de Buenos Aires
        </Text>

        {/* Property */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Propiedad</Text>
          <View style={styles.card}>
            <View style={styles.fieldFull}>
              <Text style={styles.fieldLabel}>Dirección</Text>
              <Text style={styles.fieldValue}>{fmt(data.property.address)}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Partido</Text>
              <Text style={styles.fieldValue}>{fmt(data.property.partido)}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Tipo declarado</Text>
              <Text style={styles.fieldValue}>{fmt(data.property.property_type)}</Text>
            </View>
          </View>
        </View>

        {/* Catastral */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos catastrales oficiales</Text>
          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Partida</Text>
              <Text style={styles.fieldValueMono}>{fmt(data.arba.partida)}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Tipo (ARBA)</Text>
              <Text style={styles.fieldValue}>{fmt(data.arba.tipo)}</Text>
            </View>
            <View style={styles.fieldFull}>
              <Text style={styles.fieldLabel}>Nomenclatura catastral</Text>
              <Text style={styles.fieldValueMono}>{fmt(data.arba.nomenclatura)}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Superficie del lote</Text>
              <Text style={styles.fieldValue}>{fmtSurface(data.arba.surface_arba)}</Text>
            </View>
          </View>
        </View>

        {/* Polygon */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Polígono catastral</Text>
          <PolygonView geometry={data.arba.geometry} />
        </View>

        {/* Comparison */}
        {hasComparison && delta && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Superficie declarada vs ARBA</Text>
            <View style={styles.card}>
              <View style={[styles.comparisonRow, { width: "100%" }]}>
                <Text style={styles.comparisonLabel}>Superficie declarada en el aviso</Text>
                <Text style={styles.comparisonValue}>
                  {fmtSurface(data.property.surface_total)}
                </Text>
              </View>
              <View style={[styles.comparisonRow, { width: "100%" }]}>
                <Text style={styles.comparisonLabel}>Superficie ARBA del lote</Text>
                <Text style={styles.comparisonValue}>
                  {fmtSurface(data.arba.surface_arba)}
                </Text>
              </View>
              <View style={[styles.comparisonRow, styles.comparisonRowLast, { width: "100%" }]}>
                <Text style={styles.comparisonLabel}>Diferencia</Text>
                <Text
                  style={
                    delta.style === "ok"
                      ? styles.comparisonDeltaOk
                      : delta.style === "warn"
                      ? styles.comparisonDeltaWarn
                      : styles.comparisonDeltaBad
                  }
                >
                  {delta.pct > 0 ? "+" : ""}
                  {delta.pct.toFixed(1)}% · {delta.label}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Los datos catastrales fueron obtenidos del sistema público de ARBA (GeoServer / WFS) en la fecha de emisión.
            Este informe no reemplaza un Informe de Dominio, una Cédula Catastral oficial ni un Certificado para escrituración.
            Para operaciones legales (escritura, garantía, juicio) consultar con un escribano y/o agrimensor matriculado.
          </Text>
          <Text style={styles.footerBrand}>Jotaeme — Oportunidades Inmobiliarias</Text>
        </View>
      </Page>
    </Document>
  );
}
