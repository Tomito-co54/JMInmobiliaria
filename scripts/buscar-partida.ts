#!/usr/bin/env node
/**
 * CLI: find the partida (ARBA tax ID) for a street address.
 *
 * Usage:
 *   npm run buscar-partida -- "Talcahuano 258, Banfield, Lomas de Zamora"
 *
 * Why this exists: the owner loader (`npm run cargar-propiedad`) asks for a
 * partida because that is the precise key — either ARBA has it or it does
 * not. But a broker does not always have the paper record to hand, and the
 * pipeline already knows how to go the other way: the scraped listings are
 * matched to parcels from coordinates every day. This is that same path,
 * pointed at one address typed by a human.
 *
 * It is a lookup aid, NOT a source of truth. Geocoding puts a pin on a
 * street number and ARBA answers about whatever parcel that pin landed in,
 * so the answer is only as good as the pin. Read the nomenclatura and the
 * surface back against what you know about the property before loading it —
 * an `intersects` match on a plausible surface is solid; a `dwithin` match
 * several metres away means the pin fell in the street or on the neighbour.
 *
 * Read-only against ARBA. Geocoding results are cached the same 90 days as
 * the pipeline's, which is the only write it makes.
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { geocodeAddress } from "@/lib/services/geocoding";
import { getParcelByPoint } from "@/lib/services/arba/wfs";

async function main() {
  const query = process.argv.slice(2).join(" ").trim();
  if (!query) {
    console.error('Uso: npm run buscar-partida -- "Talcahuano 258, Banfield, Lomas de Zamora"');
    process.exit(1);
  }

  // Nominatim answers better with the country spelled out, and the pipeline
  // queries it the same way.
  const full = /argentina/i.test(query) ? query : `${query}, Buenos Aires, Argentina`;

  console.log(`Buscando: ${full}\n`);

  const geo = await geocodeAddress(full);
  if (!geo) {
    console.log("Geocoding: sin resultado.");
    console.log("Probá con menos detalle, o con la localidad y el partido separados.");
    process.exit(2);
  }
  console.log(`Coordenadas : ${geo.lat}, ${geo.lng}`);

  const parcel = await getParcelByPoint(geo.lat, geo.lng);
  if (!parcel) {
    console.log("\nARBA: ninguna parcela dentro del radio de búsqueda.");
    console.log("El pin puede haber caído fuera de la cartografía. Verificá la dirección.");
    process.exit(3);
  }

  console.log("");
  console.log(`partida               : ${parcel.partida ?? "(la parcela no tiene partida asignada)"}`);
  console.log(`nomenclatura_catastral: ${parcel.nomenclatura}`);
  console.log(`superficie de parcela : ${parcel.surfaceM2 ?? "—"} m²`);
  console.log(`tipo (tpa)            : ${parcel.tipo ?? "—"}`);
  console.log(`cómo se encontró      : ${parcel.matchStrategy}${
    parcel.distanceMeters ? ` (a ${Math.round(parcel.distanceMeters)} m del pin)` : ""
  }`);

  if (parcel.matchStrategy !== "intersects") {
    console.log("");
    console.log("OJO: el punto NO cayó dentro del polígono, se tomó la parcela más");
    console.log("cercana. Confirmá la superficie contra lo que sabés de la propiedad");
    console.log("antes de usar esta partida.");
  }
}

main().catch((e) => {
  console.error("ERROR:", e instanceof Error ? e.message : e);
  process.exit(1);
});
