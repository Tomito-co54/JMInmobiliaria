import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

/**
 * Shared browser client for scrapers. Provides a Chromium context with
 * realistic settings and a rate-limited page fetcher.
 *
 * Usage:
 *   const client = await createScraperClient();
 *   const page = await client.newPage();
 *   await client.gotoRateLimited(page, "https://...");
 *   ...
 *   await client.close();
 */

export interface ScraperClient {
  newPage: () => Promise<Page>;
  gotoRateLimited: (page: Page, url: string) => Promise<void>;
  close: () => Promise<void>;
}

interface ClientOptions {
  /** Min milliseconds between successive page.goto() calls. Default 8000 (1 req / 8s).
   *  Zonaprop tends to 403 the second page if requests are too close together. */
  minDelayMs?: number;
  /** Identifiable user agent. Default JotaemeBot. */
  userAgent?: string;
  /** Set true to see the browser window (useful for debugging). Default false. */
  headed?: boolean;
}

const DEFAULT_USER_AGENT =
  process.env.SCRAPER_USER_AGENT ||
  "JotaemeBot/1.0 (+https://jotaeme-beryl.vercel.app; respectful scraping for buyer-side real estate platform)";

export async function createScraperClient(
  options: ClientOptions = {},
): Promise<ScraperClient> {
  const minDelayMs = options.minDelayMs ?? 8000;
  const userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
  const headed = options.headed ?? false;

  const browser: Browser = await chromium.launch({ headless: !headed });
  const context: BrowserContext = await browser.newContext({
    userAgent,
    viewport: { width: 1280, height: 800 },
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
  });

  let lastRequestAt = 0;

  async function newPage(): Promise<Page> {
    return context.newPage();
  }

  async function gotoRateLimited(page: Page, url: string): Promise<void> {
    const now = Date.now();
    const elapsed = now - lastRequestAt;
    if (elapsed < minDelayMs) {
      const wait = minDelayMs - elapsed;
      await new Promise((r) => setTimeout(r, wait));
    }
    lastRequestAt = Date.now();

    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });

    if (!response) {
      throw new Error(`No response from ${url}`);
    }
    const status = response.status();
    if (status >= 400) {
      throw new Error(`HTTP ${status} from ${url}`);
    }
  }

  async function close(): Promise<void> {
    await context.close();
    await browser.close();
  }

  return { newPage, gotoRateLimited, close };
}
