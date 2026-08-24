import { describe, it, expect } from "vitest";
import { describePasswordResetFailure } from "./password-reset-errors";

describe("describePasswordResetFailure", () => {
  it("surfaces rate limiting, which leaks nothing about the account", () => {
    const message = describePasswordResetFailure(429);
    expect(message).not.toBeNull();
    expect(message).toContain("Esperá un minuto");
  });

  it("stays silent on anything else, to avoid email enumeration", () => {
    // A 400/422 can mean "no such user". Saying so would turn this form
    // into an oracle for which addresses have an account.
    expect(describePasswordResetFailure(400)).toBeNull();
    expect(describePasswordResetFailure(422)).toBeNull();
    expect(describePasswordResetFailure(500)).toBeNull();
    expect(describePasswordResetFailure(undefined)).toBeNull();
  });
});
