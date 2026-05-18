/**
 * Email templates — plain string builders for HTML + text bodies.
 *
 * We render HTML by hand (no React Email / MJML) because:
 *   1. Only two templates today; the abstraction cost outweighs the gain.
 *   2. Email HTML is mostly tables anyway — frameworks just hide it.
 *   3. Keeps the dependency tree thin.
 *
 * Brand-aligned styling: navy + gold. Mobile-friendly (single column,
 * 600px max). Inline styles only — email clients strip <style> blocks.
 */

const NAVY = "#1A1B5C";
const GOLD = "#D4A24C";
const TEXT = "#111111";
const MUTED = "#666666";
const BORDER = "#E5E7EB";

interface CommonContext {
  appOrigin: string;
  propertyUrl: string;
  recipientName?: string | null;
}

interface NewMatchContext extends CommonContext {
  propertyAddress: string | null;
  propertyPartido: string | null;
  matchScore: number;
  matchLabel: string;
  qualityScore: number | null;
  priceFormatted: string | null;
  typeLabel: string | null;
  profileName: string;
  coverUrl: string | null;
}

interface PriceDropContext extends CommonContext {
  propertyAddress: string | null;
  propertyPartido: string | null;
  oldPriceFormatted: string;
  newPriceFormatted: string;
  dropPctFormatted: string;
  coverUrl: string | null;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shell(innerHtml: string): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head><body style="margin:0;padding:0;background:#F4F4F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${TEXT};"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F4F4F7;padding:24px 12px;"><tr><td align="center"><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid ${BORDER};">${innerHtml}</table><p style="margin:16px 0 0;color:${MUTED};font-size:12px;line-height:18px;">Jotaeme — Oportunidades Inmobiliarias · Zona Sur GBA<br>Recibís este email porque tenés una búsqueda activa. Para desactivar las alertas, editá tu perfil en la plataforma.</p></td></tr></table></body></html>`;
}

function header(): string {
  return `<tr><td style="background:${NAVY};padding:20px 24px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="color:#FFFFFF;font-weight:700;font-size:20px;letter-spacing:-0.01em;">Jotaeme</td><td align="right" style="color:#FFFFFF;opacity:0.7;font-size:12px;">Oportunidades Inmobiliarias</td></tr></table></td></tr>`;
}

function ctaButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0;"><tr><td style="background:${NAVY};border-radius:8px;"><a href="${escape(href)}" style="display:inline-block;padding:12px 24px;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:14px;">${escape(label)}</a></td></tr></table>`;
}

function metaRow(label: string, value: string): string {
  return `<tr><td style="padding:6px 0;color:${MUTED};font-size:13px;width:140px;">${escape(label)}</td><td style="padding:6px 0;color:${TEXT};font-size:13px;font-weight:500;">${escape(value)}</td></tr>`;
}

function coverImg(url: string | null): string {
  if (!url) return "";
  return `<tr><td style="padding:0;"><img src="${escape(url)}" alt="" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></td></tr>`;
}

// ---------------------------------------------------------------------------
// new_match
// ---------------------------------------------------------------------------

export function renderNewMatchEmail(ctx: NewMatchContext): { subject: string; html: string; text: string } {
  const greeting = ctx.recipientName ? `Hola ${escape(ctx.recipientName)},` : "Hola,";
  const subject = `Nueva propiedad — Match ${ctx.matchScore}/100`;
  const inner = `
    ${header()}
    ${coverImg(ctx.coverUrl)}
    <tr><td style="padding:24px;">
      <p style="margin:0 0 8px;color:${MUTED};font-size:13px;">${greeting}</p>
      <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:${TEXT};line-height:1.3;">Apareció una propiedad que te encaja</h1>
      <p style="margin:0 0 16px;color:${MUTED};font-size:14px;">Para tu búsqueda <strong style="color:${TEXT};">${escape(ctx.profileName)}</strong>.</p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${BORDER};margin-bottom:16px;">
        <tr><td colspan="2" style="padding-top:16px;">
          <p style="margin:0 0 2px;font-size:24px;font-weight:700;color:${TEXT};">${ctx.priceFormatted ? escape(ctx.priceFormatted) : "Consultar precio"}</p>
          <p style="margin:0;color:${MUTED};font-size:14px;">${ctx.propertyAddress ? escape(ctx.propertyAddress) : "Sin dirección"}${ctx.propertyPartido ? ", " + escape(ctx.propertyPartido) : ""}</p>
        </td></tr>
        ${ctx.typeLabel ? metaRow("Tipo", ctx.typeLabel) : ""}
        ${metaRow("Match", `${ctx.matchScore}/100 — ${ctx.matchLabel}`)}
        ${ctx.qualityScore !== null ? metaRow("Calidad", `${ctx.qualityScore}/100`) : ""}
      </table>

      ${ctaButton("Ver en Jotaeme", ctx.propertyUrl)}
    </td></tr>
  `;
  const text =
    `${greeting}\n\nApareció una propiedad que te encaja para tu búsqueda "${ctx.profileName}".\n\n` +
    `${ctx.priceFormatted ?? "Consultar precio"}\n` +
    `${ctx.propertyAddress ?? "Sin dirección"}${ctx.propertyPartido ? ", " + ctx.propertyPartido : ""}\n` +
    (ctx.typeLabel ? `Tipo: ${ctx.typeLabel}\n` : "") +
    `Match: ${ctx.matchScore}/100 (${ctx.matchLabel})\n` +
    (ctx.qualityScore !== null ? `Calidad: ${ctx.qualityScore}/100\n` : "") +
    `\nVer en Jotaeme: ${ctx.propertyUrl}\n`;
  return { subject, html: shell(inner), text };
}

// ---------------------------------------------------------------------------
// price_drop
// ---------------------------------------------------------------------------

export function renderPriceDropEmail(ctx: PriceDropContext): { subject: string; html: string; text: string } {
  const greeting = ctx.recipientName ? `Hola ${escape(ctx.recipientName)},` : "Hola,";
  const subject = `Bajó de precio: ${ctx.newPriceFormatted} (-${ctx.dropPctFormatted})`;
  const inner = `
    ${header()}
    ${coverImg(ctx.coverUrl)}
    <tr><td style="padding:24px;">
      <p style="margin:0 0 8px;color:${MUTED};font-size:13px;">${greeting}</p>
      <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:${TEXT};line-height:1.3;">Bajó el precio de una propiedad guardada</h1>
      <p style="margin:0 0 16px;color:${MUTED};font-size:14px;">${ctx.propertyAddress ? escape(ctx.propertyAddress) : "Sin dirección"}${ctx.propertyPartido ? ", " + escape(ctx.propertyPartido) : ""}</p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${BORDER};border-bottom:1px solid ${BORDER};margin-bottom:16px;">
        <tr><td style="padding:16px 0;">
          <p style="margin:0 0 4px;color:${MUTED};font-size:13px;text-decoration:line-through;">${escape(ctx.oldPriceFormatted)}</p>
          <p style="margin:0;font-size:28px;font-weight:700;color:${GOLD};">${escape(ctx.newPriceFormatted)}</p>
          <p style="margin:6px 0 0;color:${MUTED};font-size:13px;">Bajó <strong style="color:${TEXT};">${escape(ctx.dropPctFormatted)}</strong> desde la última vez que la viste.</p>
        </td></tr>
      </table>

      ${ctaButton("Ver en Jotaeme", ctx.propertyUrl)}
    </td></tr>
  `;
  const text =
    `${greeting}\n\nBajó el precio de una propiedad que tenés guardada.\n\n` +
    `${ctx.propertyAddress ?? "Sin dirección"}${ctx.propertyPartido ? ", " + ctx.propertyPartido : ""}\n` +
    `Antes: ${ctx.oldPriceFormatted}\n` +
    `Ahora: ${ctx.newPriceFormatted} (-${ctx.dropPctFormatted})\n\n` +
    `Ver en Jotaeme: ${ctx.propertyUrl}\n`;
  return { subject, html: shell(inner), text };
}
