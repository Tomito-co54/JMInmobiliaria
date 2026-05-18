import { getAppOrigin, getFromAddress, getResendClient } from "./client";
import {
  renderNewMatchEmail,
  renderPriceDropEmail,
  renderServiceDeliveryEmail,
} from "./templates";

/**
 * High-level email send functions for alert types.
 *
 * Each returns one of:
 *   { ok: true, id }                              — Resend accepted
 *   { ok: false, skipped: true, reason }          — env not configured
 *   { ok: false, error }                          — Resend rejected
 *
 * Callers (today: scripts/detect-alerts.ts) log the result and move on —
 * a failed email never blocks the in-app alert, which is the source of
 * truth.
 */

export type SendResult =
  | { ok: true; id: string }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; error: string };

interface NewMatchInput {
  to: string;
  recipientName: string | null;
  profileName: string;
  matchScore: number;
  matchLabel: string;
  qualityScore: number | null;
  property: {
    id: string;
    address: string | null;
    partido: string | null;
    price_amount: number | null;
    price_currency: "USD" | "ARS" | null;
    property_type: string | null;
    photos: string[];
  };
}

interface PriceDropInput {
  to: string;
  recipientName: string | null;
  oldAmount: number;
  newAmount: number;
  currency: string;
  property: {
    id: string;
    address: string | null;
    partido: string | null;
    photos: string[];
  };
}

interface ServiceDeliveryInput {
  to: string;
  recipientName: string | null;
  serviceTitle: string;
  propertyAddress: string | null;
  folio: string;
  downloadUrl: string;
}

const TYPE_LABELS: Record<string, string> = {
  casa: "Casa",
  departamento: "Departamento",
  ph: "PH",
  lote: "Lote",
  local: "Local",
};

function fmtPrice(amount: number, currency: string): string {
  return `${currency} ${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(amount)}`;
}

function notConfigured(): SendResult | null {
  if (!getResendClient()) {
    return { ok: false, skipped: true, reason: "no RESEND_API_KEY" };
  }
  if (!getFromAddress()) {
    return { ok: false, skipped: true, reason: "no RESEND_FROM" };
  }
  return null;
}

export async function sendNewMatchEmail(input: NewMatchInput): Promise<SendResult> {
  const skip = notConfigured();
  if (skip) return skip;
  const client = getResendClient()!;
  const from = getFromAddress()!;
  const origin = getAppOrigin();

  const { property } = input;
  const priceFormatted =
    property.price_amount !== null && property.price_currency
      ? fmtPrice(property.price_amount, property.price_currency)
      : null;
  const typeLabel = property.property_type
    ? TYPE_LABELS[property.property_type] ?? property.property_type
    : null;

  const { subject, html, text } = renderNewMatchEmail({
    appOrigin: origin,
    propertyUrl: `${origin}/p/${property.id}`,
    recipientName: input.recipientName,
    profileName: input.profileName,
    matchScore: input.matchScore,
    matchLabel: input.matchLabel,
    qualityScore: input.qualityScore,
    propertyAddress: property.address,
    propertyPartido: property.partido,
    priceFormatted,
    typeLabel,
    coverUrl: property.photos[0] ?? null,
  });

  try {
    const result = await client.emails.send({
      from,
      to: input.to,
      subject,
      html,
      text,
    });
    if (result.error) {
      return { ok: false, error: result.error.message };
    }
    return { ok: true, id: result.data?.id ?? "" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function sendPriceDropEmail(input: PriceDropInput): Promise<SendResult> {
  const skip = notConfigured();
  if (skip) return skip;
  const client = getResendClient()!;
  const from = getFromAddress()!;
  const origin = getAppOrigin();

  const { property } = input;
  const dropPct = input.oldAmount !== 0
    ? ((input.oldAmount - input.newAmount) / input.oldAmount) * 100
    : 0;

  const { subject, html, text } = renderPriceDropEmail({
    appOrigin: origin,
    propertyUrl: `${origin}/p/${property.id}`,
    recipientName: input.recipientName,
    propertyAddress: property.address,
    propertyPartido: property.partido,
    oldPriceFormatted: fmtPrice(input.oldAmount, input.currency),
    newPriceFormatted: fmtPrice(input.newAmount, input.currency),
    dropPctFormatted: `${dropPct.toFixed(1)}%`,
    coverUrl: property.photos[0] ?? null,
  });

  try {
    const result = await client.emails.send({
      from,
      to: input.to,
      subject,
      html,
      text,
    });
    if (result.error) {
      return { ok: false, error: result.error.message };
    }
    return { ok: true, id: result.data?.id ?? "" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function sendServiceDeliveryEmail(
  input: ServiceDeliveryInput,
): Promise<SendResult> {
  const skip = notConfigured();
  if (skip) return skip;
  const client = getResendClient()!;
  const from = getFromAddress()!;
  const origin = getAppOrigin();

  const { subject, html, text } = renderServiceDeliveryEmail({
    appOrigin: origin,
    propertyUrl: `${origin}/mis-servicios`,
    recipientName: input.recipientName,
    serviceTitle: input.serviceTitle,
    propertyAddress: input.propertyAddress,
    folio: input.folio,
    downloadUrl: input.downloadUrl,
  });

  try {
    const result = await client.emails.send({
      from,
      to: input.to,
      subject,
      html,
      text,
    });
    if (result.error) {
      return { ok: false, error: result.error.message };
    }
    return { ok: true, id: result.data?.id ?? "" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
