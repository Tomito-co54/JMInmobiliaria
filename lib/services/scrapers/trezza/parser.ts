import type { Page, Locator } from "playwright";
import type {
  ScrapedProperty,
  PropertyType,
  PriceCurrency,
} from "../types";
import { absolutize } from "./urls";

/**
 * Parse a Trezza Propiedades listings page.
 *
 * Trezza uses infinite scroll: cards load as the user scrolls down.
 * We scroll programmatically until card count stops growing.
 *
 * Selectors (verified Nov 2026):
 *   - Card container:   .bloque_item
 *   - Link:             .bloque_item a[href*="/propiedad/"]
 *   - Type + Partido:   .bloque_item h5     (e.g. "Departamentos - Lomas de Zamora")
 *   - Title:            .bloque_item h3
 *   - Address:          .bloque_item .direccion__txt
 *   - Status (Vendido): .bloque_item .estado
 *   - Operation:        .bloque_item .operacion .op
 *   - Data spans:       .bloque_item .datos span[data-original-title]
 *     (titles like "1 ambiente", "2 baños", "3 dormitorios")
 *
 * Prices are sourced from the embedded JSON-LD CollectionPage script tag,
 * since the price doesn't always show in the card HTML.
 */

const CARD_SELECTOR = ".bloque_item";

/** Map of property_id -> { price, currency } extracted from page JSON-LD */
type PriceMap = Map<string, { price: number; currency: PriceCurrency }>;

export async function parseListPage(
  page: Page,
  expectedPartido: string,
  maxProperties: number,
): Promise<ScrapedProperty[]> {
  try {
    await page.waitForSelector(CARD_SELECTOR, { timeout: 15000 });
  } catch {
    return [];
  }

  // Trigger infinite scroll until we have enough cards or the page stops loading more
  await scrollUntilStable(page, maxProperties);

  const priceMap = await extractPricesFromJsonLd(page);

  const cards = page.locator(CARD_SELECTOR);
  const count = await cards.count();
  const results: ScrapedProperty[] = [];

  for (let i = 0; i < count && results.length < maxProperties; i++) {
    const card = cards.nth(i);
    try {
      const property = await parseCard(card, expectedPartido, priceMap);
      if (property) results.push(property);
    } catch (err) {
      console.warn(
        `[trezza parser] failed to parse card ${i}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return results;
}

/** Scroll to bottom repeatedly until card count stops growing. */
async function scrollUntilStable(page: Page, target: number): Promise<void> {
  let previousCount = 0;
  let stableIterations = 0;
  const maxIterations = 12;

  for (let i = 0; i < maxIterations; i++) {
    const currentCount = await page.locator(CARD_SELECTOR).count();
    if (currentCount >= target) return;

    if (currentCount === previousCount) {
      stableIterations++;
      if (stableIterations >= 2) return; // count didn't grow in 2 attempts -> done
    } else {
      stableIterations = 0;
    }
    previousCount = currentCount;

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1500);
  }
}

/**
 * Read all embedded application/ld+json scripts and build a price lookup
 * keyed by Trezza property ID (extracted from the listing URL).
 */
async function extractPricesFromJsonLd(page: Page): Promise<PriceMap> {
  const map: PriceMap = new Map();
  const scripts = await page
    .locator('script[type="application/ld+json"]')
    .allInnerTexts();

  for (const raw of scripts) {
    try {
      const json = JSON.parse(raw);
      const items = Array.isArray(json.hasPart) ? json.hasPart : [];
      for (const item of items) {
        if (item?.["@type"] !== "RealEstateListing") continue;
        const url: string = item.url ?? "";
        const match = url.match(/\/propiedad\/(\d+)/);
        if (!match) continue;
        const id = match[1];
        const price = item?.offers?.price;
        const currency = item?.offers?.priceCurrency;
        if (typeof price === "number" && (currency === "USD" || currency === "ARS")) {
          map.set(id, { price, currency });
        }
      }
    } catch {
      // Skip malformed JSON-LD blocks
    }
  }
  return map;
}

async function parseCard(
  card: Locator,
  expectedPartido: string,
  priceMap: PriceMap,
): Promise<ScrapedProperty | null> {
  // Skip sold properties
  const estado = await card
    .locator(".estado")
    .first()
    .innerText()
    .catch(() => "");
  if (/vendid|alquilad|reservad/i.test(estado)) return null;

  // Skip rentals (we only want venta for MVP)
  const operacion = await card
    .locator(".operacion .op")
    .first()
    .innerText()
    .catch(() => "");
  if (!/venta/i.test(operacion)) return null;

  const href = await card
    .locator('a[href*="/propiedad/"]')
    .first()
    .getAttribute("href");
  if (!href) return null;

  const idMatch = href.match(/\/propiedad\/(\d+)/);
  if (!idMatch) return null;
  const externalId = idMatch[1];
  const url = absolutize(href);

  // h5 has the form "{TipoPlural} - {Partido}"
  const typeAndPartido = await card
    .locator("h5")
    .first()
    .innerText()
    .catch(() => "");
  const propertyType = parsePropertyType(typeAndPartido);

  const title = await card
    .locator("h3")
    .first()
    .innerText()
    .catch(() => "");

  const address = await card
    .locator(".direccion__txt")
    .first()
    .innerText()
    .catch(() => "");

  // Data spans use data-original-title for the human-readable label
  const dataLabels = await card
    .locator(".datos span[data-original-title]")
    .evaluateAll((els) =>
      els
        .map((el) => el.getAttribute("data-original-title"))
        .filter(Boolean) as string[],
    );

  const features = parseDataLabels(dataLabels);

  const firstPhoto = await card
    .locator(".foto")
    .first()
    .evaluate((el) => {
      const bg = (el as HTMLElement).style.backgroundImage || "";
      const m = bg.match(/url\(["']?([^"')]+)["']?\)/);
      return m ? m[1] : null;
    })
    .catch(() => null);

  const priceInfo = priceMap.get(externalId);

  return {
    source: "trezza",
    externalId,
    url,
    partido: expectedPartido,
    address: address.trim() || undefined,
    propertyType,
    operationType: "venta",
    priceAmount: priceInfo?.price,
    priceCurrency: priceInfo?.currency,
    rooms: features.rooms,
    bedrooms: features.bedrooms,
    bathrooms: features.bathrooms,
    description: title.trim() || undefined,
    photos: firstPhoto ? [firstPhoto] : [],
  };
}

function parsePropertyType(text: string): PropertyType | undefined {
  const lower = text.toLowerCase();
  if (lower.includes("ph")) return "ph";
  if (lower.includes("departamento")) return "departamento";
  if (lower.includes("casa")) return "casa";
  if (lower.includes("lote") || lower.includes("terreno")) return "lote";
  if (lower.includes("local") || lower.includes("oficina")) return "local";
  return undefined;
}

interface FeaturesParsed {
  rooms?: number;
  bedrooms?: number;
  bathrooms?: number;
}

/**
 * Parse labels like "1 ambiente", "2 baños", "3 dormitorios".
 */
function parseDataLabels(labels: string[]): FeaturesParsed {
  const out: FeaturesParsed = {};
  for (const label of labels) {
    const m = label.match(/(\d+)/);
    if (!m) continue;
    const n = parseInt(m[1], 10);
    const lower = label.toLowerCase();
    if (lower.includes("dormit")) out.bedrooms = n;
    else if (lower.includes("ambient")) out.rooms = n;
    else if (lower.includes("baño") || lower.includes("bano")) out.bathrooms = n;
  }
  return out;
}
