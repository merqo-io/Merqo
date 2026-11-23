// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const {
  getUser,
  getOrCreateVendorProfile,
  maybeSingle,
  loadFounderNumber,
  loadVendorTrial,
} = vi.hoisted(() => ({
  loadFounderNumber: vi.fn(),
  loadVendorTrial: vi.fn(),
  getUser: vi.fn(),
  getOrCreateVendorProfile: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => getUser() },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  }),
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { updateUser: vi.fn() } }),
}));
vi.mock("@/lib/entitlements/store", () => ({ loadFounderNumber }));
vi.mock("@/lib/entitlements/trial-store", () => ({ loadVendorTrial }));
vi.mock("@/lib/merqo-vendor-profile", () => ({ getOrCreateVendorProfile }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("./vendor-telegram-actions", () => ({
  mintVendorTelegramConnectToken: vi.fn(),
  disconnectVendorTelegram: vi.fn(),
}));

import ProfilePage from "./page";

describe("ProfilePage", () => {
  beforeEach(() => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    loadFounderNumber.mockResolvedValue(null);
    loadVendorTrial.mockResolvedValue(null);
  });

  async function renderAs() {
    getUser.mockResolvedValue({
      data: { user: { id: "v1", email: "v@x.sg", user_metadata: {} } },
    });
    getOrCreateVendorProfile.mockResolvedValue({
      vendor_id: "v1",
      stall_name: "Kopi",
      social_links: {},
    });
    render(await ProfilePage());
  }

  it("shows the founding merchant badge for a founder", async () => {
    loadFounderNumber.mockResolvedValue(3);
    await renderAs();
    expect(screen.getByText("Founding merchant #03")).toBeInTheDocument();
  });

  it("shows the days left while a trial is running", async () => {
    loadVendorTrial.mockResolvedValue({
      status: "active",
      endsAt: new Date(Date.now() + 5.5 * 86_400_000).toISOString(),
    });
    await renderAs();
    expect(screen.getByText("Pro trial: 6 days left")).toBeInTheDocument();
  });

  it("shows nothing for a blocked or expired trial", async () => {
    loadVendorTrial.mockResolvedValue({
      status: "blocked",
      endsAt: new Date(Date.now() + 5 * 86_400_000).toISOString(),
    });
    await renderAs();
    expect(screen.queryByText(/Pro trial/)).toBeNull();
  });

  it("shows no trial text when the trial lookup fails", async () => {
    loadVendorTrial.mockRejectedValue(new Error("db"));
    await renderAs();
    expect(screen.queryByText(/Pro trial/)).toBeNull();
  });

  it("shows no badge for a non-founder or when the lookup fails", async () => {
    await renderAs();
    expect(screen.queryByText(/Founding merchant/)).not.toBeInTheDocument();
    cleanup();
    loadFounderNumber.mockRejectedValue(new Error("db"));
    await renderAs();
    expect(screen.queryByText(/Founding merchant/)).not.toBeInTheDocument();
  });

  it("renders the form with the vendor's shared profile and auth-user fields", async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: "v1",
          email: "vendor@business.sg",
          user_metadata: {
            display_name: "Aisha",
            avatar_url: "https://x/pic.jpg",
          },
        },
      },
    });
    getOrCreateVendorProfile.mockResolvedValue({
      vendor_id: "v1",
      stall_name: "Kopi & Co",
      social_links: { website: "https://kopi.example" },
    });

    render(await ProfilePage());

    expect(screen.getByLabelText("Business name")).toHaveValue("Kopi & Co");
    expect(screen.getByLabelText("Display name")).toHaveValue("Aisha");
    expect(screen.getByLabelText("Email")).toHaveValue("vendor@business.sg");
  });

  it("renders the vendor Telegram connect section as disconnected when there's no vendor_telegram row", async () => {
    getUser.mockResolvedValue({
      data: {
        user: { id: "v1", email: "vendor@business.sg", user_metadata: {} },
      },
    });
    getOrCreateVendorProfile.mockResolvedValue({
      vendor_id: "v1",
      stall_name: "Kopi & Co",
      social_links: {},
    });
    maybeSingle.mockResolvedValue({ data: null, error: null });

    render(await ProfilePage());

    expect(
      screen.getByRole("button", { name: /connect telegram/i }),
    ).toBeInTheDocument();
  });

  it("renders the vendor Telegram connect section as connected when a vendor_telegram row exists", async () => {
    getUser.mockResolvedValue({
      data: {
        user: { id: "v1", email: "vendor@business.sg", user_metadata: {} },
      },
    });
    getOrCreateVendorProfile.mockResolvedValue({
      vendor_id: "v1",
      stall_name: "Kopi & Co",
      social_links: {},
    });
    maybeSingle.mockResolvedValue({ data: { vendor_id: "v1" }, error: null });

    render(await ProfilePage());

    expect(screen.getByText(/telegram connected/i)).toBeInTheDocument();
  });
});
