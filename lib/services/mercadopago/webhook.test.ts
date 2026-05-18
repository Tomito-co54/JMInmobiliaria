import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { verifyWebhookSignature } from "./webhook";

const SECRET = "test-webhook-secret-abc123";

function signManifest(ts: string, requestId: string, dataId: string): string {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  return createHmac("sha256", SECRET).update(manifest).digest("hex");
}

describe("verifyWebhookSignature", () => {
  const ts = "1700000000";
  const requestId = "req-uuid-1";
  const dataId = "payment-99";
  const validHash = signManifest(ts, requestId, dataId);
  const validHeader = `ts=${ts},v1=${validHash}`;

  it("accepts a correctly-signed payload", () => {
    expect(
      verifyWebhookSignature({
        signatureHeader: validHeader,
        requestIdHeader: requestId,
        dataId,
        secret: SECRET,
      }),
    ).toBe(true);
  });

  it("rejects a tampered dataId", () => {
    expect(
      verifyWebhookSignature({
        signatureHeader: validHeader,
        requestIdHeader: requestId,
        dataId: "payment-100",
        secret: SECRET,
      }),
    ).toBe(false);
  });

  it("rejects a tampered request-id", () => {
    expect(
      verifyWebhookSignature({
        signatureHeader: validHeader,
        requestIdHeader: "req-uuid-2",
        dataId,
        secret: SECRET,
      }),
    ).toBe(false);
  });

  it("rejects a wrong secret", () => {
    expect(
      verifyWebhookSignature({
        signatureHeader: validHeader,
        requestIdHeader: requestId,
        dataId,
        secret: "wrong-secret",
      }),
    ).toBe(false);
  });

  it("rejects a malformed signature header (no v1)", () => {
    expect(
      verifyWebhookSignature({
        signatureHeader: `ts=${ts}`,
        requestIdHeader: requestId,
        dataId,
        secret: SECRET,
      }),
    ).toBe(false);
  });

  it("rejects when signatureHeader is null", () => {
    expect(
      verifyWebhookSignature({
        signatureHeader: null,
        requestIdHeader: requestId,
        dataId,
        secret: SECRET,
      }),
    ).toBe(false);
  });

  it("rejects when requestIdHeader is null", () => {
    expect(
      verifyWebhookSignature({
        signatureHeader: validHeader,
        requestIdHeader: null,
        dataId,
        secret: SECRET,
      }),
    ).toBe(false);
  });

  it("rejects when v1 hash has different length than expected", () => {
    expect(
      verifyWebhookSignature({
        signatureHeader: `ts=${ts},v1=abc`,
        requestIdHeader: requestId,
        dataId,
        secret: SECRET,
      }),
    ).toBe(false);
  });
});
