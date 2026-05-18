import "server-only";
import { MercadoPagoConfig } from "mercadopago";

/**
 * MercadoPago server-side client.
 *
 * Lazy: throws if used without env vars, so a missing key doesn't crash
 * the build (e.g. when a preview deploy runs without the secret yet).
 *
 * The access token determines whether we're in test mode or production:
 * - APP_USR-... starting tokens in the "Credenciales de prueba" tab => test
 * - APP_USR-... starting tokens in the "Credenciales de producción" tab => prod
 *
 * MP unified the prefix in 2024 — tokens from either tab look identical,
 * but the API enforces sandbox-vs-real separation server-side.
 */

let cachedConfig: MercadoPagoConfig | null = null;

export function getMercadoPagoConfig(): MercadoPagoConfig {
  if (cachedConfig) return cachedConfig;
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "MERCADOPAGO_ACCESS_TOKEN missing — set it in .env.local (test) or Vercel (prod)",
    );
  }
  cachedConfig = new MercadoPagoConfig({
    accessToken: token,
    options: { timeout: 8_000 },
  });
  return cachedConfig;
}

export function isMercadoPagoConfigured(): boolean {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);
}
