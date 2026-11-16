// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  verifyOtp: vi.fn(),
  createServerClient: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: "merqo.io" }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: mocks.createServerClient,
}));
import AuthConfirmPage from "./page";
import { KIT_AUTH_ORIGINS } from "@/lib/kits";

const TOKEN = { token_hash: "abc", type: "recovery" };
const render_ = async (sp: Record<string, string>) =>
  render(await AuthConfirmPage({ searchParams: Promise.resolve(sp) }));

beforeEach(() => vi.clearAllMocks());

describe("auth confirm page", () => {
  it("renders the continue form for a link meant for merqo", async () => {
    await render_({
      ...TOKEN,
      redirect_to: "https://merqo.io/auth/callback?next=/reset-password",
    });
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(screen.getByRole("button")).toBeInTheDocument();
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  it("renders the form when redirect_to is missing", async () => {
    await render_(TOKEN);
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("renders the invalid state without a token", async () => {
    await render_({ type: "recovery" });
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("link")).toBeInTheDocument();
  });

  it("forwards a kit link without next", async () => {
    await render_({
      ...TOKEN,
      redirect_to: "https://qkit.merqo.io/auth/callback",
    });
    expect(mocks.redirect).toHaveBeenCalledWith(
      "https://qkit.merqo.io/auth/confirm?token_hash=abc&type=recovery",
    );
  });

  it("forwards a kit link with next", async () => {
    await render_({
      ...TOKEN,
      redirect_to:
        "https://loopkit.merqo.io/auth/callback?next=/reset-password",
    });
    expect(mocks.redirect).toHaveBeenCalledWith(
      "https://loopkit.merqo.io/auth/confirm?token_hash=abc&type=recovery&next=%2Freset-password",
    );
  });

  it.each([
    "https://evil.com/auth/callback",
    "https://qkit.merqo.io.evil.com/auth/callback",
    "https://merqo.io/auth/callback",
  ])("does not forward %s", async (redirect_to) => {
    await render_({ ...TOKEN, redirect_to });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("never calls Supabase while rendering", async () => {
    await render_(TOKEN);
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });
});

describe("KIT_AUTH_ORIGINS", () => {
  it("lists all five kits", () => {
    expect(KIT_AUTH_ORIGINS).toEqual([
      "https://qkit.merqo.io",
      "https://loopkit.merqo.io",
      "https://paykit.merqo.io",
      "https://stockkit.merqo.io",
      "https://printkit.merqo.io",
    ]);
  });

  it("falls back to the default host when an env override is empty", async () => {
    vi.stubEnv("NEXT_PUBLIC_QKIT_URL", "");
    vi.stubEnv("NEXT_PUBLIC_PRINTKIT_URL", "  ");
    vi.resetModules();
    const { KIT_AUTH_ORIGINS: origins } = await import("@/lib/kits");
    expect(origins).toContain("https://qkit.merqo.io");
    expect(origins).toContain("https://printkit.merqo.io");
    vi.unstubAllEnvs();
  });
});
