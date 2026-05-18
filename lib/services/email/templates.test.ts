import { describe, expect, it } from "vitest";
import { renderNewMatchEmail, renderPriceDropEmail } from "./templates";

/**
 * Email templates are HTML rendered by hand. These tests don't snapshot
 * the entire HTML (too brittle) — they assert that the key pieces of data
 * the user actually cares about appear in both the HTML and the plain
 * text version, plus a few structural invariants.
 */

describe("renderNewMatchEmail", () => {
  const base = {
    appOrigin: "https://jotaeme.test",
    propertyUrl: "https://jotaeme.test/p/abc-123",
    recipientName: "Tomy",
    profileName: "Casa familiar Lomas",
    matchScore: 87,
    matchLabel: "Match perfecto",
    qualityScore: 72,
    propertyAddress: "Av. Hipólito Yrigoyen 1234",
    propertyPartido: "Lomas de Zamora",
    priceFormatted: "USD 200.000",
    typeLabel: "Casa",
    coverUrl: "https://example.com/cover.jpg",
  };

  it("subject includes the match score", () => {
    const { subject } = renderNewMatchEmail(base);
    expect(subject).toContain("87");
  });

  it("HTML includes the recipient name, price, address, score, profile name", () => {
    const { html } = renderNewMatchEmail(base);
    expect(html).toContain("Tomy");
    expect(html).toContain("USD 200.000");
    expect(html).toContain("Av. Hipólito Yrigoyen 1234");
    expect(html).toContain("Lomas de Zamora");
    expect(html).toContain("87");
    expect(html).toContain("Match perfecto");
    expect(html).toContain("Casa familiar Lomas");
  });

  it("HTML CTA links to the property URL", () => {
    const { html } = renderNewMatchEmail(base);
    expect(html).toContain("https://jotaeme.test/p/abc-123");
  });

  it("HTML embeds the cover image when provided", () => {
    const { html } = renderNewMatchEmail(base);
    expect(html).toContain("https://example.com/cover.jpg");
  });

  it("omits cover image when null", () => {
    const { html } = renderNewMatchEmail({ ...base, coverUrl: null });
    expect(html).not.toContain("<img");
  });

  it("text body includes the same key data as HTML", () => {
    const { text } = renderNewMatchEmail(base);
    expect(text).toContain("Tomy");
    expect(text).toContain("USD 200.000");
    expect(text).toContain("87/100");
    expect(text).toContain("Casa familiar Lomas");
    expect(text).toContain("https://jotaeme.test/p/abc-123");
  });

  it("escapes HTML in user-supplied fields", () => {
    const { html } = renderNewMatchEmail({
      ...base,
      profileName: "<script>alert('xss')</script>",
    });
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders gracefully when price/type/qualityScore are null", () => {
    const { html, text } = renderNewMatchEmail({
      ...base,
      priceFormatted: null,
      typeLabel: null,
      qualityScore: null,
    });
    expect(html).toContain("Consultar precio");
    expect(text).toContain("Consultar precio");
    // No crashes, no stray "null" strings.
    expect(html).not.toMatch(/\bnull\b/);
  });

  it("works without a recipient name (uses generic greeting)", () => {
    const { html } = renderNewMatchEmail({ ...base, recipientName: null });
    expect(html).toContain("Hola,");
    expect(html).not.toContain("Hola ,");
  });
});

describe("renderPriceDropEmail", () => {
  const base = {
    appOrigin: "https://jotaeme.test",
    propertyUrl: "https://jotaeme.test/p/abc-123",
    recipientName: "Tomy",
    propertyAddress: "Calle Falsa 123",
    propertyPartido: "Lomas de Zamora",
    oldPriceFormatted: "USD 220.000",
    newPriceFormatted: "USD 200.000",
    dropPctFormatted: "9.1%",
    coverUrl: null,
  };

  it("subject highlights the new price and drop %", () => {
    const { subject } = renderPriceDropEmail(base);
    expect(subject).toContain("USD 200.000");
    expect(subject).toContain("9.1%");
  });

  it("HTML shows old and new price + the CTA URL", () => {
    const { html } = renderPriceDropEmail(base);
    expect(html).toContain("USD 220.000");
    expect(html).toContain("USD 200.000");
    expect(html).toContain("9.1%");
    expect(html).toContain("https://jotaeme.test/p/abc-123");
  });

  it("text body includes Antes/Ahora structure", () => {
    const { text } = renderPriceDropEmail(base);
    expect(text).toContain("Antes:");
    expect(text).toContain("Ahora:");
    expect(text).toContain("USD 220.000");
    expect(text).toContain("USD 200.000");
  });

  it("escapes HTML in user-supplied fields", () => {
    const { html } = renderPriceDropEmail({
      ...base,
      propertyAddress: "<img src=x onerror=alert(1)>",
    });
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img");
  });
});
