import { afterEach, describe, expect, it, vi } from "vitest";
import { authErrorCopy } from "./auth-error-copy";

describe("authErrorCopy", () => {
  afterEach(() => vi.restoreAllMocks());

  it("maps invalid credentials", () => {
    expect(authErrorCopy("Invalid login credentials", "x")).toBe(
      "Email or password is incorrect.",
    );
  });

  it("maps rate limits", () => {
    expect(authErrorCopy("email rate limit exceeded", "x")).toBe(
      "Too many attempts. Wait a minute and try again.",
    );
  });

  it("maps weak passwords", () => {
    expect(authErrorCopy("Password should be at least 8 characters", "x")).toBe(
      "Choose a stronger password.",
    );
  });

  it("falls back and logs the raw message for unknown errors", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(
      authErrorCopy("AuthApiError: db blew up", "Could not save. Try again."),
    ).toBe("Could not save. Try again.");
    expect(spy).toHaveBeenCalledWith("auth error:", "AuthApiError: db blew up");
  });

  it("falls back when there is no message", () => {
    expect(authErrorCopy(null, "Could not save. Try again.")).toBe(
      "Could not save. Try again.",
    );
  });
});
