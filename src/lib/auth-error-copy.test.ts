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

  it("maps same-password and rate-limit phrases", () => {
    expect(
      authErrorCopy(
        "New password should be different from the old password.",
        "x",
      ),
    ).toBe("Choose a password you have not used before.");
    expect(authErrorCopy("Too many requests", "x")).toBe(
      "Too many attempts. Wait a minute and try again.",
    );
  });

  it("does not map loose look-alike messages", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(authErrorCopy("weak signal", "fb")).toBe("fb");
    expect(authErrorCopy("too many rows returned", "fb")).toBe("fb");
    expect(authErrorCopy("the same as the old config", "fb")).toBe("fb");
    expect(authErrorCopy("corporate limit reached", "fb")).toBe("fb");
  });

  it("falls back and logs only a tag and code, never the message", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(
      authErrorCopy(
        "failed for jo@example.com",
        "Could not save. Try again.",
        "unexpected_failure",
      ),
    ).toBe("Could not save. Try again.");
    const logged = JSON.stringify(spy.mock.calls);
    expect(logged).not.toContain("jo@example.com");
    expect(logged).not.toContain("failed for");
    expect(logged).toContain("unexpected_failure");
  });

  it("falls back when there is no message", () => {
    expect(authErrorCopy(null, "Could not save. Try again.")).toBe(
      "Could not save. Try again.",
    );
  });
});
