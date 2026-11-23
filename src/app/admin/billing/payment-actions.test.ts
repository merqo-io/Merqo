import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireMerqoTeam: vi.fn(),
  recordAudit: vi.fn(),
  findVendorId: vi.fn(),
  setRevenueConfig: vi.fn(),
  insertPayment: vi.fn(),
  deletePayment: vi.fn(),
  findPayment: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/team", () => ({ requireMerqoTeam: mocks.requireMerqoTeam }));
vi.mock("@/lib/admin", () => ({ recordAudit: mocks.recordAudit }));
vi.mock("@/lib/entitlements/store", () => ({
  findVendorId: mocks.findVendorId,
}));
vi.mock("@/lib/entitlements/billing-config", () => ({
  setRevenueConfig: mocks.setRevenueConfig,
}));
vi.mock("@/lib/entitlements/ledger", () => ({
  PAYMENT_METHODS: ["paynow", "bank_transfer", "other"],
  insertPayment: mocks.insertPayment,
  deletePayment: mocks.deletePayment,
  findPayment: mocks.findPayment,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import {
  deletePaymentAction,
  recordPaymentAction,
  setRevenueCapAction,
} from "./payment-actions";

const PAYMENT = {
  email: " Vendor@Test.SG ",
  amount: "1234.56",
  date: "2026-03-01",
  method: "paynow" as const,
  reference: "",
  note: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  mocks.requireMerqoTeam.mockResolvedValue({ user: { id: "admin-1" } });
  mocks.findVendorId.mockResolvedValue("vendor-1");
  mocks.findPayment.mockResolvedValue({
    vendorId: "vendor-1",
    amountCents: 123456,
    receivedOn: "2026-03-01",
  });
});

describe("auth", () => {
  it("stops every action when the caller is not on the team", async () => {
    mocks.requireMerqoTeam.mockRejectedValue(new Error("nope"));
    await expect(
      setRevenueCapAction({ cap: "", windowStart: "" }),
    ).rejects.toThrow();
    await expect(recordPaymentAction(PAYMENT)).rejects.toThrow();
    await expect(
      deletePaymentAction({ id: "5f0d2f0e-8c3b-4c53-9c7e-0b0f5d3e9a11" }),
    ).rejects.toThrow();
    expect(mocks.setRevenueConfig).not.toHaveBeenCalled();
    expect(mocks.insertPayment).not.toHaveBeenCalled();
    expect(mocks.deletePayment).not.toHaveBeenCalled();
  });
});

describe("setRevenueCapAction", () => {
  it("stores the cap in cents and audits without the amount", async () => {
    expect(
      await setRevenueCapAction({ cap: "1234.56", windowStart: "2026-02-01" }),
    ).toEqual({ success: true });
    expect(mocks.setRevenueConfig).toHaveBeenCalledWith({
      capCents: 123456,
      windowStart: "2026-02-01",
    });
    expect(mocks.recordAudit).toHaveBeenCalledWith(
      "admin-1",
      "set_revenue_cap",
      null,
      { cap_set: true, window_start: "2026-02-01" },
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/billing");
  });

  it("clears the cap and window with empty values", async () => {
    await setRevenueCapAction({ cap: "", windowStart: "" });
    expect(mocks.setRevenueConfig).toHaveBeenCalledWith({
      capCents: null,
      windowStart: null,
    });
  });

  it("rejects a zero, malformed or oversized cap and a bad date", async () => {
    for (const input of [
      { cap: "0", windowStart: "" },
      { cap: "1.234", windowStart: "" },
      { cap: "99999999999", windowStart: "" },
      { cap: "5", windowStart: "2026-02-31" },
    ]) {
      expect((await setRevenueCapAction(input)).success).toBe(false);
    }
    expect(mocks.setRevenueConfig).not.toHaveBeenCalled();
  });

  it("reports a write failure", async () => {
    mocks.setRevenueConfig.mockRejectedValue(new Error("db"));
    expect(await setRevenueCapAction({ cap: "5", windowStart: "" })).toEqual({
      success: false,
      error: "Could not save that. Try again.",
    });
  });
});

describe("recordPaymentAction", () => {
  it("records cents against the looked-up vendor", async () => {
    expect(await recordPaymentAction(PAYMENT)).toEqual({ success: true });
    expect(mocks.findVendorId).toHaveBeenCalledWith("vendor@test.sg");
    expect(mocks.insertPayment).toHaveBeenCalledWith({
      vendorId: "vendor-1",
      amountCents: 123456,
      receivedOn: "2026-03-01",
      method: "paynow",
      reference: null,
      note: null,
      recordedBy: "admin-1",
    });
    expect(mocks.recordAudit).toHaveBeenCalledWith(
      "admin-1",
      "record_payment",
      "vendor-1",
      { amount_cents: 123456, received_on: "2026-03-01", method: "paynow" },
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/admin/vendors/vendor%40test.sg",
    );
  });

  it("keeps a reference and note", async () => {
    await recordPaymentAction({ ...PAYMENT, reference: " r1 ", note: " n " });
    expect(mocks.insertPayment).toHaveBeenCalledWith(
      expect.objectContaining({ reference: "r1", note: "n" }),
    );
  });

  it("rejects invalid input", async () => {
    for (const bad of [
      { ...PAYMENT, amount: "0" },
      { ...PAYMENT, amount: "1.999" },
      { ...PAYMENT, email: "nope" },
      { ...PAYMENT, date: "2026-13-01" },
      { ...PAYMENT, method: "cash" as "paynow" },
    ]) {
      expect((await recordPaymentAction(bad)).success).toBe(false);
    }
    expect(mocks.insertPayment).not.toHaveBeenCalled();
  });

  it("fails when the vendor has no account", async () => {
    mocks.findVendorId.mockResolvedValue(null);
    expect(await recordPaymentAction(PAYMENT)).toEqual({
      success: false,
      error: "That vendor has no Merqo account yet.",
    });
    expect(mocks.insertPayment).not.toHaveBeenCalled();
  });

  it("reports an insert failure", async () => {
    mocks.insertPayment.mockRejectedValue(new Error("db"));
    expect((await recordPaymentAction(PAYMENT)).success).toBe(false);
  });
});

describe("deletePaymentAction", () => {
  const id = "5f0d2f0e-8c3b-4c53-9c7e-0b0f5d3e9a11";

  it("deletes, audits and refreshes", async () => {
    expect(await deletePaymentAction({ id, email: "v@t.sg" })).toEqual({
      success: true,
    });
    expect(mocks.deletePayment).toHaveBeenCalledWith(id);
    expect(mocks.recordAudit).toHaveBeenCalledWith(
      "admin-1",
      "delete_payment",
      "vendor-1",
      { payment_id: id, amount_cents: 123456, received_on: "2026-03-01" },
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/admin/vendors/v%40t.sg",
    );
  });

  it("returns an error and no audit row when the payment is gone", async () => {
    mocks.findPayment.mockResolvedValue(null);
    expect(await deletePaymentAction({ id })).toEqual({
      success: false,
      error: "Payment not found",
    });
    expect(mocks.deletePayment).not.toHaveBeenCalled();
    expect(mocks.recordAudit).not.toHaveBeenCalled();
  });

  it("rejects a malformed id", async () => {
    expect((await deletePaymentAction({ id: "x" })).success).toBe(false);
    expect(mocks.deletePayment).not.toHaveBeenCalled();
  });

  it("reports a delete failure", async () => {
    mocks.deletePayment.mockRejectedValue(new Error("db"));
    expect((await deletePaymentAction({ id })).success).toBe(false);
  });
});
