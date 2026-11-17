import { afterEach, describe, expect, it, vi } from "vitest";
import { authErrorCopy, weakPasswordMessage } from "./auth-error-copy";

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

  it("maps weak_password by code without logging it as unmapped", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(
      authErrorCopy(
        "Password should be at least 8 characters.",
        "x",
        "weak_password",
        ["length"],
      ),
    ).toBe("Password is too short. Use at least 8 characters.");
    expect(spy).not.toHaveBeenCalled();
  });

  it("maps weak-password messages without a code", () => {
    expect(
      authErrorCopy("Password should be at least 6 characters.", "x"),
    ).toBe("Password is too short. Use at least 6 characters.");
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

const SETS =
  "Password should contain at least one character of each: abcdefghijklmnopqrstuvwxyz, ABCDEFGHIJKLMNOPQRSTUVWXYZ, 0123456789, !@#$%^&*().";

describe("weakPasswordMessage", () => {
  it("names the length from the message", () => {
    expect(
      weakPasswordMessage({
        reasons: ["length"],
        message: "Password should be at least 8 characters.",
      }),
    ).toBe("Password is too short. Use at least 8 characters.");
  });

  it("handles length without a number", () => {
    expect(weakPasswordMessage({ reasons: ["length"], message: "x" })).toBe(
      "Password is too short. Use a longer one.",
    );
  });

  it("names parsed character classes", () => {
    expect(
      weakPasswordMessage({ reasons: ["characters"], message: SETS }),
    ).toBe(
      "Password must include a lowercase letter, an uppercase letter, a number and a symbol.",
    );
    expect(
      weakPasswordMessage({
        reasons: ["characters"],
        message:
          "Password should contain at least one character of each: abcdefghijklmnopqrstuvwxyz, 0123456789.",
      }),
    ).toBe("Password must include a lowercase letter and a number.");
  });

  it("falls back when character sets cannot be parsed", () => {
    expect(weakPasswordMessage({ reasons: ["characters"], message: "x" })).toBe(
      "Password needs a wider mix of characters, such as upper and lower case letters, numbers and symbols.",
    );
  });

  it("explains breached passwords", () => {
    expect(weakPasswordMessage({ reasons: ["pwned"], message: "x" })).toBe(
      "This password has appeared in a data breach. Choose a different one.",
    );
  });

  it("joins several reasons", () => {
    expect(
      weakPasswordMessage({
        reasons: ["length", "pwned"],
        message: "Password should be at least 8 characters.",
      }),
    ).toBe(
      "Password is too short. Use at least 8 characters. This password has appeared in a data breach. Choose a different one.",
    );
  });

  it("infers reasons from the message when none are given", () => {
    expect(
      weakPasswordMessage({
        message: `Password should be at least 8 characters. ${SETS}`,
      }),
    ).toBe(
      "Password is too short. Use at least 8 characters. Password must include a lowercase letter, an uppercase letter, a number and a symbol.",
    );
  });

  it("uses a generic message when nothing is recognisable", () => {
    expect(weakPasswordMessage({ reasons: [], message: "nope" })).toBe(
      "That password is too weak. Choose a longer, less common one.",
    );
    expect(weakPasswordMessage({})).toBe(
      "That password is too weak. Choose a longer, less common one.",
    );
  });
});
