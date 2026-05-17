import type { Page, Locator } from "playwright";
import type {
  ScrapedProperty,
  PropertyType,
  PriceCurrency,
} from "../types";
import { absolutize } from "./urls";

/**
 * Parse a Zonaprop listings page and return all property cards found.
 *
 * Selectors (verified against Zonaprop Nov 2026):
 *   - Card container: [data-qa="posting PROPERTY"]
 *     - data-id: external ID
 *     - data-to-posting: relative URL
 *   - Price:    [data-qa="POSTING_CARD_PRICE"]       e.g. "USD 55.000"
 *   - Features: [data-qa="POSTING_CARD_FEATURES"]    e.g. "139 m² tot. · 4 amb. · 2 dorm. · 1 baño"
 *   - Location: [data-qa="POSTING_CARD_LOCATION"]    e.g. "Temperley, Lomas de Zamora"
 *   - Address:  .postingLocations-module__location-address
 *   - Desc:     [data-qa="POSTING_CARD_DESCRIPTION"]
 *   - Gallery:  [data-qa="POSTING_CARD_GALLERY"] img (first photo)
 */

const CARD_SELECTOR = '[data-qa="posting PROPERTY"]';

/**
 * Wait for cards to render and extract all property data on the current page.
 * Returns an empty array if no cards are present (end of pagination).
 */
export async function parseListPage(
  page: Page,
  expectedPartido: string,
): Promise<ScrapedProperty[]> {
  // Wait until at least one card is in the DOM (with a soft timeout)
  try {
    await page.waitForSelector(CARD_SELECTOR, { timeout: 15000 });
  } catch {
    return [];
  }

  const cards = page.locator(CARD_SELECTOR);
  const count = await cards.count();
  const results: ScrapedProperty[] = [];

  for (let i = 0; i < count; i++) {
    const card = cards.nth(i);
    try {
      const property = await parseCard(card, expectedPartido);
      if (property) results.push(property);
    } catch (err) {
      // Skip this card on parse error; don't fail the whole page
      console.warn(
        `[zonaprop parser] failed to parse card ${i}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return results;
}

async function parseCard(
  card: Locator,
  expectedPartido: string,
): Promise<ScrapedProperty | null> {
  const externalId = await card.getAttribute("data-id");
  const dataTo = await card.getAttribute("data-to-posting");
  if (!externalId || !dataTo) return null;

  // Strip query params from URL (they're tracking junk)
  const cleanPath = dataTo.split("?")[0];
  const url = absolutize(cleanPath);

  const priceText = await card
    .locator('[data-qa="POSTING_CARD_PRICE"]')
    .first()
    .innerText()
    .catch(() => "");

  const featuresText = await card
    .locator('[data-qa="POSTING_CARD_FEATURES"]')
    .first()
    .innerText()
    .catch(() => "");

  const locationText = await card
    .locator('[data-qa="POSTING_CARD_LOCATION"]')
    .first()
    .innerText()
    .catch(() => "");

  const address = await card
    .locator(".postingLocations-module__location-address")
    .first()
    .innerText()
    .catch(() => "");

  // First photo from the gallery + its alt (alt contains the property type)
  const galleryImg = card.locator('[data-qa="POSTING_CARD_GALLERY"] img').first();
  const firstPhoto = await galleryImg.getAttribute("src").catch(() => null);
  const altText = await galleryImg.getAttribute("alt").catch(() => null);

  // Description from the listing alt or description block
  const description = await card
    .locator('[data-qa="POSTING_CARD_DESCRIPTION"]')
    .first()
    .innerText()
    .catch(() => "");

  // Property type: from img alt ("Casa · 80m² · 4 Ambientes") or fall back to URL
  const propertyType = guessPropertyType(altText, url);

  const { amount: priceAmount, currency: priceCurrency } = parsePrice(priceText);
  const features = parseFeatures(featuresText);

  return {
    source: "zonaprop",
    externalId,
    url,
    partido: expectedPartido,
    locationText: locationText.trim() || undefined,
    address: address.trim() || undefined,
    propertyType,
    operationType: "venta",
    priceAmount,
    priceCurrency,
    surfaceTotal: features.surfaceTotal,
    surfaceCovered: features.surfaceCovered,
    rooms: features.rooms,
    bedrooms: features.bedrooms,
    bathrooms: features.bathrooms,
    garages: features.garages,
    description: description.trim() || undefined,
    photos: firstPhoto ? [firstPhoto] : [],
  };
}

/**
 * Parse "USD 55.000" or "$ 95.000.000" etc.
 * Returns null/undefined if format is "Consultar precio" or similar.
 */
function parsePrice(text: string): {
  amount: number | undefined;
  currency: PriceCurrency | undefined;
} {
  if (!text) return { amount: undefined, currency: undefined };
  const upper = text.toUpperCase();
  if (upper.includes("CONSULTAR")) return { amount: undefined, currency: undefined };

  let currency: PriceCurrency | undefined;
  if (upper.includes("USD") || upper.includes("U$S")) currency = "USD";
  else if (upper.includes("$") || upper.includes("ARS")) currency = "ARS";

  // Pull just digits (Zonaprop uses "." as thousands separator)
  const digits = text.replace(/[^\d]/g, "");
  const amount = digits ? parseInt(digits, 10) : undefined;

  return { amount, currency };
}

interface FeaturesParsed {
  surfaceTotal?: number;
  surfaceCovered?: number;
  rooms?: number;
  bedrooms?: number;
  bathrooms?: number;
  garages?: number;
}

/**
 * Parse "139 m² tot. · 100 m² cub. · 4 amb. · 2 dorm. · 1 baño · 1 coch."
 * Tokens are separated by · or newlines; each token is "<number> <unit>".
 */
function parseFeatures(text: string): FeaturesParsed {
  if (!text) return {};
  const out: FeaturesParsed = {};
  const tokens = text.split(/[·\n]/).map((t) => t.trim()).filter(Boolean);

  for (const token of tokens) {
    const numMatch = token.match(/^([\d.,]+)/);
    if (!numMatch) continue;
    const num = parseFloat(numMatch[1].replace(/\./g, "").replace(",", "."));
    if (isNaN(num)) continue;
    const lower = token.toLowerCase();

    if (lower.includes("m² tot") || lower.includes("m2 tot")) {
      out.surfaceTotal = num;
    } else if (lower.includes("m² cub") || lower.includes("m2 cub")) {
      out.surfaceCovered = num;
    } else if (lower.includes("amb")) {
      out.rooms = Math.round(num);
    } else if (lower.includes("dorm")) {
      out.bedrooms = Math.round(num);
    } else if (lower.includes("baño") || lower.includes("bano")) {
      out.bathrooms = Math.round(num);
    } else if (lower.includes("coch")) {
      out.garages = Math.round(num);
    }
  }

  return out;
}

function guessPropertyType(
  alt: string | null,
  url: string,
): PropertyType | undefined {
  const text = `${alt ?? ""} ${url}`.toLowerCase();
  // Order matters: more specific first
  if (text.includes("ph ") || text.includes("/ph-")) return "ph";
  if (text.includes("departamento") || text.includes("depto")) return "departamento";
  if (text.includes("casa")) return "casa";
  if (text.includes("lote") || text.includes("terreno")) return "lote";
  if (text.includes("local") || text.includes("oficina")) return "local";
  return undefined;
}
