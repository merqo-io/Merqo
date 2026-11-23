import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
  rpc: vi.fn(),
  insert: vi.fn(),
  deleteEq: vi.fn(),
  order2: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: mocks.createServiceClient,
}));

import {
  deletePayment,
  findPayment,
  insertPayment,
  listRecentPayments,
  listVendorPayments,
  revenueTotalSince,
} from "./ledger";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createServiceClient.mockResolvedValue({
    rpc: mocks.rpc,
    from: () => ({
      insert: mocks.insert,
      delete: () => ({ eq: mocks.deleteEq }),
      select: () => ({
        eq: () => ({
          order: () => ({ order: mocks.order2 }),
          maybeSingle: mocks.maybeSingle,
        }),
      }),
    }),
  });
});

describe("revenueTotalSince", () => {
  it("returns the total as a number", async () => {
    mocks.rpc.mockResolvedValue({ data: "123456", error: null });
    expect(await revenueTotalSince("2026-01-01")).toBe(123456);
    expect(mocks.rpc).toHaveBeenCalledWith("revenue_total", {
      p_from: "2026-01-01",
    });
  });

  it("treats a null total as zero", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    expect(await revenueTotalSince("2026-01-01")).toBe(0);
  });

  it("throws on error", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "x" } });
    await expect(revenueTotalSince("2026-01-01")).rejects.toThrow(
      "revenue total: x",
    );
  });
});

describe("listRecentPayments", () => {
  it("maps rows to camel case", async () => {
    mocks.rpc.mockResolvedValue({
      data: [
        {
          id: "p1",
          vendor_email: "a@b.sg",
          amount_cents: 500,
          received_on: "2026-03-01",
          method: "paynow",
          reference: "r",
          note: null,
        },
      ],
      error: null,
    });
    expect(await listRecentPayments(10)).toEqual([
      {
        id: "p1",
        vendorEmail: "a@b.sg",
        amountCents: 500,
        receivedOn: "2026-03-01",
        method: "paynow",
        reference: "r",
        note: null,
      },
    ]);
    expect(mocks.rpc).toHaveBeenCalledWith("recent_payments", { p_limit: 10 });
  });

  it("returns an empty list for no data", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    expect(await listRecentPayments(10)).toEqual([]);
  });

  it("throws on error", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "x" } });
    await expect(listRecentPayments(10)).rejects.toThrow("payments read: x");
  });
});

describe("listVendorPayments", () => {
  it("attaches the vendor email", async () => {
    mocks.order2.mockResolvedValue({
      data: [
        {
          id: "p1",
          amount_cents: 700,
          received_on: "2026-03-02",
          method: "other",
          reference: null,
          note: "n",
        },
      ],
      error: null,
    });
    const rows = await listVendorPayments("v1", "a@b.sg");
    expect(rows[0]).toMatchObject({ vendorEmail: "a@b.sg", amountCents: 700 });
  });

  it("returns an empty list for no data", async () => {
    mocks.order2.mockResolvedValue({ data: null, error: null });
    expect(await listVendorPayments("v1", "a@b.sg")).toEqual([]);
  });

  it("throws on error", async () => {
    mocks.order2.mockResolvedValue({ data: null, error: { message: "x" } });
    await expect(listVendorPayments("v1", "a@b.sg")).rejects.toThrow(
      "vendor payments read: x",
    );
  });
});

describe("insertPayment", () => {
  const payment = {
    vendorId: "v1",
    amountCents: 123456,
    receivedOn: "2026-03-01",
    method: "paynow" as const,
    reference: null,
    note: null,
    recordedBy: "admin",
  };

  it("inserts a snake case row", async () => {
    mocks.insert.mockResolvedValue({ error: null });
    await insertPayment(payment);
    expect(mocks.insert).toHaveBeenCalledWith({
      vendor_id: "v1",
      amount_cents: 123456,
      received_on: "2026-03-01",
      method: "paynow",
      reference: null,
      note: null,
      recorded_by: "admin",
    });
  });

  it("throws on error", async () => {
    mocks.insert.mockResolvedValue({ error: { message: "x" } });
    await expect(insertPayment(payment)).rejects.toThrow("payment insert: x");
  });
});

describe("findPayment", () => {
  it("returns the row summary", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: { vendor_id: "v1", amount_cents: 500, received_on: "2026-03-01" },
      error: null,
    });
    expect(await findPayment("p1")).toEqual({
      vendorId: "v1",
      amountCents: 500,
      receivedOn: "2026-03-01",
    });
  });

  it("returns null when no row matches", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await findPayment("p1")).toBeNull();
  });

  it("throws on error", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: "x" },
    });
    await expect(findPayment("p1")).rejects.toThrow("payment read: x");
  });
});

describe("deletePayment", () => {
  it("deletes by id", async () => {
    mocks.deleteEq.mockResolvedValue({ error: null });
    await deletePayment("p1");
    expect(mocks.deleteEq).toHaveBeenCalledWith("id", "p1");
  });

  it("throws on error", async () => {
    mocks.deleteEq.mockResolvedValue({ error: { message: "x" } });
    await expect(deletePayment("p1")).rejects.toThrow("payment delete: x");
  });
});
