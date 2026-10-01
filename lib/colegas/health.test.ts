import { describe, expect, it } from "vitest";
import { unreadReason } from "./health";

describe("unreadReason", () => {
  it("is null for a listing walked to its end with its pages read", () => {
    expect(unreadReason("exhausted", 44, 37, 0)).toBeNull();
    // A few pages that failed to load are a flaky network, not an unread partner.
    expect(unreadReason("exhausted", 44, 37, 3)).toBeNull();
  });

  it("names a listing that could not be walked to the end", () => {
    expect(unreadReason("page_error", 0, 37, 0)).toMatch(/no se pudo recorrer entero \(fin: page_error\)/);
    expect(unreadReason("page_cap", 480, 37, 0)).toMatch(/page_cap/);
  });

  it("does not believe an empty listing when something was published, or when that could not be read", () => {
    expect(unreadReason("exhausted", 0, 37, 0)).toBe("el listado volvió vacío");
    expect(unreadReason("exhausted", 0, null, 0)).toBe("el listado volvió vacío");
    // A partner with nothing published yet and nothing listed has nothing to sync.
    expect(unreadReason("exhausted", 0, 0, 0)).toBeNull();
  });

  it("names a run where most property pages failed to load", () => {
    expect(unreadReason("exhausted", 44, 37, 23)).toBe("23 de 44 fichas no cargaron");
    expect(unreadReason("exhausted", 44, 37, 22)).toBeNull();
  });
});
