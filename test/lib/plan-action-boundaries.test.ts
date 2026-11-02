import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  active: vi.fn(),
  products: vi.fn(),
  catalog: vi.fn(),
  subscriptions: vi.fn(),
  createRequest: vi.fn(),
}));
vi.mock("@/lib/vendor", () => ({
  loadVendorContext: mocks.context,
  hasActiveLinkFor: mocks.active,
}));
vi.mock("@/lib/products", () => ({ listLiveProducts: mocks.products }));
vi.mock("@/lib/pricing/catalog", () => ({ loadPlanCatalog: mocks.catalog }));
vi.mock("@/lib/entitlements/store", () => ({
  loadVendorSubscriptions: mocks.subscriptions,
}));
vi.mock("@/lib/subscription-requests", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/subscription-requests")>()),
  createSubscriptionRequest: mocks.createRequest,
}));
import { requestUpgrade } from "@/app/actions/upgrade";
import { requestDowngrade } from "@/app/actions/downgrade";

const plan = (
  slug: string,
  kind: string,
  kits: string[],
  monthlyCents = 0,
) => ({
  slug,
  kind,
  monthlyCents,
  includedKits: kits,
  active: true,
  eventPass: null,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.context.mockResolvedValue({
    user: { id: "vendor-1", email: "vendor@example.com" },
    links: [],
  });
  mocks.active.mockReturnValue(true);
  mocks.products.mockResolvedValue([{ slug: "qkit" }]);
  mocks.catalog.mockResolvedValue([
    plan("starter", "starter", ["qkit"], 1200),
    plan("qkit", "kit", ["qkit", "printkit"], 1600),
  ]);
  mocks.subscriptions.mockResolvedValue([]);
  mocks.createRequest.mockResolvedValue({ created: true });
});

for (const [name, action] of [
  ["upgrade", requestUpgrade],
  ["downgrade", requestDowngrade],
] as const) {
  it(`${name} rejects signed-out callers`, async () => {
    mocks.context.mockResolvedValue({ user: null, links: [] });
    expect(await action("qkit")).toMatchObject({ success: false });
    expect(mocks.createRequest).not.toHaveBeenCalled();
  });
  it(`${name} rejects users without an email`, async () => {
    mocks.context.mockResolvedValue({ user: {}, links: [] });
    expect(await action("qkit")).toMatchObject({ success: false });
  });
  it(`${name} rejects a kit without active access`, async () => {
    mocks.active.mockReturnValue(false);
    expect(await action("qkit")).toMatchObject({ success: false });
    expect(mocks.products).not.toHaveBeenCalled();
  });
  it(`${name} rejects an unregistered kit`, async () => {
    mocks.products.mockResolvedValue([{ slug: "loopkit" }]);
    expect(await action("qkit")).toMatchObject({ success: false });
    expect(mocks.createRequest).not.toHaveBeenCalled();
  });
  it(`${name} returns a recoverable failure on context outage`, async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.context.mockRejectedValue(new Error("outage"));
    expect(await action("qkit")).toMatchObject({ success: false });
    log.mockRestore();
  });
  it(`${name} returns a recoverable failure when the request cannot be filed`, async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.createRequest.mockRejectedValue(new Error("db down"));
    expect(await action("qkit")).toMatchObject({ success: false });
    log.mockRestore();
  });
}

it("upgrade files a request for the cheapest plan including the kit", async () => {
  expect(await requestUpgrade("qkit")).toEqual({ success: true });
  expect(mocks.createRequest).toHaveBeenCalledWith({
    vendorId: "vendor-1",
    planSlug: "starter",
    kind: "upgrade",
    note: expect.stringContaining("qkit"),
  });
});

it("upgrade fails when no plan is on sale for the kit", async () => {
  mocks.catalog.mockResolvedValue([]);
  expect(await requestUpgrade("qkit")).toMatchObject({ success: false });
  expect(mocks.createRequest).not.toHaveBeenCalled();
});

it("downgrade files a cancel request for the subscription covering the kit", async () => {
  mocks.subscriptions.mockResolvedValue([
    { planSlug: "old", status: "canceled", includedKits: ["qkit"] },
    { planSlug: "qkit", status: "active", includedKits: ["qkit", "printkit"] },
  ]);
  expect(await requestDowngrade("qkit")).toEqual({ success: true });
  expect(mocks.createRequest).toHaveBeenCalledWith({
    vendorId: "vendor-1",
    planSlug: "qkit",
    kind: "cancel",
    note: expect.stringContaining("qkit"),
  });
});

it("downgrade falls back to the free plan when no subscription covers the kit", async () => {
  expect(await requestDowngrade("qkit")).toEqual({ success: true });
  expect(mocks.createRequest).toHaveBeenCalledWith(
    expect.objectContaining({ planSlug: "free", kind: "cancel" }),
  );
});
