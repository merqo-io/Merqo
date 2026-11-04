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

  it("uses neutral copy for already-registered emails", () => {
    expect(authErrorCopy("User already registered", "x")).toBe(
      "Check your email to continue.",
    );
  });

  it("does not map loose look-alike messages", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(authErrorCopy("weak signal", "fb")).toBe("fb");
    expect(authErrorCopy("too many rows returned", "fb")).toBe("fb");
  });

  it("falls back and logs a redacted, truncated message for unknown errors", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(
      authErrorCopy(
        "failed for jo@example.com " + "x".repeat(500),
        "Could not save. Try again.",
      ),
    ).toBe("Could not save. Try again.");
    const logged = spy.mock.calls.flat().join(" ");
    expect(logged).not.toContain("jo@example.com");
    expect(logged).toContain("[email]");
    expect(logged.length).toBeLessThan(260);
  });

  it("falls back when there is no message", () => {
    expect(authErrorCopy(null, "Could not save. Try again.")).toBe(
      "Could not save. Try again.",
    );
  });
});
