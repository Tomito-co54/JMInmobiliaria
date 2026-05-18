import { describe, expect, it } from "vitest";
import { renderServiceDeliveryEmail } from "./templates";

const baseCtx = {
  appOrigin: "https://jotaeme-beryl.vercel.app",
  propertyUrl: "https://jotaeme-beryl.vercel.app/mis-servicios",
  recipientName: "Juan Pérez",
  serviceTitle: "Informe Catastral ARBA",
  propertyAddress: "Av. Hipólito Yrigoyen 8200, Lomas de Zamora",
  folio: "ABCDEF12",
  downloadUrl: "https://example.com/signed/abc.pdf",
};

describe("renderServiceDeliveryEmail", () => {
  it("includes folio in subject and body", () => {
    const out = renderServiceDeliveryEmail(baseCtx);
    expect(out.subject).toContain(baseCtx.folio);
    expect(out.html).toContain(baseCtx.folio);
    expect(out.text).toContain(baseCtx.folio);
  });

  it("includes download URL as cta href and in text", () => {
    const out = renderServiceDeliveryEmail(baseCtx);
    expect(out.html).toContain(baseCtx.downloadUrl);
    expect(out.text).toContain(baseCtx.downloadUrl);
  });

  it("greets by name when provided", () => {
    const out = renderServiceDeliveryEmail(baseCtx);
    expect(out.html).toContain("Juan Pérez");
    expect(out.text).toContain("Juan Pérez");
  });

  it("falls back to generic greeting without a name", () => {
    const out = renderServiceDeliveryEmail({ ...baseCtx, recipientName: null });
    expect(out.html).toContain("Hola,");
    expect(out.text).toContain("Hola,");
  });

  it("escapes HTML in recipient name", () => {
    const out = renderServiceDeliveryEmail({
      ...baseCtx,
      recipientName: '<script>alert("xss")</script>',
    });
    expect(out.html).not.toContain("<script>");
    expect(out.html).toContain("&lt;script&gt;");
  });

  it("escapes HTML in service title", () => {
    const out = renderServiceDeliveryEmail({
      ...baseCtx,
      serviceTitle: 'Bad <img src=x>',
    });
    expect(out.html).not.toContain("<img");
    expect(out.html).toContain("Bad &lt;img");
  });

  it("works without a property address", () => {
    const out = renderServiceDeliveryEmail({
      ...baseCtx,
      propertyAddress: null,
    });
    expect(out.html).toBeTruthy();
    expect(out.subject).toBeTruthy();
  });
});
