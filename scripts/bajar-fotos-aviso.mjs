#!/usr/bin/env node
/**
 * bajar-fotos-aviso.mjs — the ad's photos into `Publicación/<Unidad>/fotos/`.
 *
 * Paso 6 of the «actualizá el sitio» protocol (PUBLICACION.md): a unit with
 * `Link Zonaprop` loaded and no gallery of its own borrows the ad's photos,
 * in the ad's order, until Tomy takes his own. They go through the folder and
 * never straight to the site — the next `--fotos` run would overwrite them.
 *
 * Uso:
 *   node scripts/bajar-fotos-aviso.mjs <url> "<carpeta de fotos>" <etiqueta>
 *
 * Example (Alsina 1639 3°Q):
 *   node scripts/bajar-fotos-aviso.mjs https://www.trezzapropiedades.com.ar/propiedad/456199  *     "C:/…/Alsina 1639/Publicación/3Q/fotos" 3Q
 *
 * Trezza serves photos from staticbp.com as `prop_new_b` (big) and
 * `prop_new_m` (medium); the medium ones are rewritten to big, and the DOM
 * order is the ad's order.
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
const [url, dir, label] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage();
await p.goto(url, { waitUntil: "networkidle", timeout: 90000 });
const srcs = await p.evaluate(() =>
  Array.from(document.querySelectorAll("img"))
    .map((i) => i.currentSrc || i.src || "")
    .filter((s) => /staticbp\.com\/img\/prop/.test(s)),
);
await b.close();
const seen = new Set();
const fotos = srcs.map((s) => s.replace("/prop_new_m/", "/prop_new_b/")).filter((s) => !seen.has(s) && seen.add(s));
await mkdir(dir, { recursive: true });
let n = 0;
for (const s of fotos) {
  n++;
  const r = await fetch(s);
  if (!r.ok) { console.log(`  ✗ ${s} → ${r.status}`); continue; }
  const name = `${String(n).padStart(2, "0")}-${label}.jpg`;
  await writeFile(join(dir, name), Buffer.from(await r.arrayBuffer()));
  console.log(`  ✓ ${name}`);
}
console.log(`${n} fotos → ${dir}`);
