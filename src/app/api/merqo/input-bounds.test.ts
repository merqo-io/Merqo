import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/bearer-guard", () => ({
  guardBearerRoute: async () => null,
}));
vi.mock("@/lib/telegram", () => ({
  sendTelegramMessage: vi.fn().mockResolvedValue(undefined),
}));
const from = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: async () => ({ from, rpc: vi.fn() }),
}));

import { POST as notifyCustomer } from "./notify-customer/route";
import { POST as notifyVendor } from "./notify-vendor/route";
import { POST as legalAccept } from "./legal-accept/route";
import { POST as customerConnect } from "./customer-connect-token/route";
import { POST as vendorConnect } from "./vendor-connect-token/route";

const VENDOR_ID = "00000000-0000-4000-8000-000000000001";

function post(path: string, body: unknown): Request {
  return new Request(`https://merqo.example.com/api/merqo/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => from.mockReset());

describe("notify message bodies are capped at Telegram's 4096", () => {
  it("notify-vendor rejects 4097 chars and not the db", async () => {
    const res = await notifyVendor(
      post("notify-vendor", {
        vendor_id: VENDOR_ID,
        message: "x".repeat(4097),
      }),
    );
    expect(res.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });

  it("notify-customer rejects 4097 chars", async () => {
    const res = await notifyCustomer(
      post("notify-customer", {
        vendor_id: VENDOR_ID,
        message: "x".repeat(4097),
        notify_ref: "ref",
      }),
    );
    expect(res.status).toBe(400);
  });
});

describe("legal-accept ip cap", () => {
  const base = {
    vendor_email: "v@business.sg",
    doc_type: "terms",
    doc_version: "2026-09-04",
    doc_sha256: "a".repeat(64),
    kit_slug: "qkit",
  };

  it("rejects an ip longer than 64 characters", async () => {
    const res = await legalAccept(
      post("legal-accept", { ...base, ip: "1".repeat(65) }),
    );
    expect(res.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });

  it("accepts a 64 character ip", async () => {
    from.mockReturnValue({ insert: async () => ({ error: null }) });
    const res = await legalAccept(
      post("legal-accept", { ...base, ip: "1".repeat(64) }),
    );
    expect(res.status).toBe(200);
  });
});

describe("free-form string caps on kit routes", () => {
  it("customer-connect-token rejects an oversized notify_ref", async () => {
    const res = await customerConnect(
      post("customer-connect-token", {
        vendor_id: VENDOR_ID,
        kit_slug: "qkit",
        notify_ref: "x".repeat(129),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("customer-connect-token rejects an oversized kit_slug", async () => {
    const res = await customerConnect(
      post("customer-connect-token", {
        vendor_id: VENDOR_ID,
        kit_slug: "k".repeat(65),
        notify_ref: "ref",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("vendor-connect-token rejects an oversized kit_slug", async () => {
    const res = await vendorConnect(
      post("vendor-connect-token", {
        vendor_id: VENDOR_ID,
        kit_slug: "k".repeat(65),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("notify-customer rejects an oversized notify_ref and phone", async () => {
    const ref = await notifyCustomer(
      post("notify-customer", {
        vendor_id: VENDOR_ID,
        message: "hi",
        notify_ref: "x".repeat(129),
      }),
    );
    const phone = await notifyCustomer(
      post("notify-customer", {
        vendor_id: VENDOR_ID,
        message: "hi",
        phone: "9".repeat(33),
      }),
    );
    expect(ref.status).toBe(400);
    expect(phone.status).toBe(400);
  });

  it("legal-accept rejects oversized doc_version, kit_slug and user_agent", async () => {
    const base = {
      vendor_email: "v@business.sg",
      doc_type: "terms",
      doc_version: "2026-09-04",
      doc_sha256: "a".repeat(64),
      kit_slug: "qkit",
    };
    for (const over of [
      { doc_version: "v".repeat(65) },
      { kit_slug: "k".repeat(65) },
      { user_agent: "u".repeat(513) },
    ]) {
      const res = await legalAccept(post("legal-accept", { ...base, ...over }));
      expect(res.status).toBe(400);
    }
    expect(from).not.toHaveBeenCalled();
  });
});
