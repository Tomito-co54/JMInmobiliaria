import { describe, it, expect } from "vitest";
import {
  describeCallbackError,
  readCallbackErrorCode,
} from "./callback-errors";

describe("describeCallbackError", () => {
  it("explains an expired one-time link", () => {
    const notice = describeCallbackError("otp_expired");
    expect(notice.message).toContain("una sola vez");
    expect(notice.canRetry).toBe(true);
  });

  it("names the cross-device cause for a failed code exchange", () => {
    // The PKCE verifier lives in a cookie on the browser that *requested*
    // the reset. Opening the mail on a phone breaks the exchange, and the
    // message has to say so or the user has no way to guess.
    expect(describeCallbackError("exchange_failed").message).toContain(
      "otro navegador o dispositivo",
    );
  });

  it("falls back instead of leaking an unknown provider code", () => {
    const notice = describeCallbackError("some_new_gotrue_code");
    expect(notice.message).not.toContain("some_new_gotrue_code");
    expect(notice).toEqual(describeCallbackError(null));
  });

  it("falls back on null and undefined", () => {
    expect(describeCallbackError(null).canRetry).toBe(true);
    expect(describeCallbackError(undefined).canRetry).toBe(true);
  });
});

describe("readCallbackErrorCode", () => {
  it("prefers the specific error_code over the coarse error", () => {
    const params = new URLSearchParams(
      "error=access_denied&error_code=otp_expired",
    );
    expect(readCallbackErrorCode(params)).toBe("otp_expired");
  });

  it("falls back to error when error_code is absent", () => {
    expect(readCallbackErrorCode(new URLSearchParams("error=access_denied"))).toBe(
      "access_denied",
    );
  });

  it("returns null when there is no error at all", () => {
    expect(readCallbackErrorCode(new URLSearchParams("code=abc123"))).toBeNull();
  });

  it("reads a fragment the same way it reads a query string", () => {
    // Real shape Supabase put in the URL bar during this bug hunt.
    const fragment =
      "error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired&sb=";
    expect(readCallbackErrorCode(new URLSearchParams(fragment))).toBe(
      "otp_expired",
    );
  });
});
