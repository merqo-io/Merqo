import { describe, it, expect, vi } from "vitest";

const { redirectMock } = vi.hoisted(() => ({ redirectMock: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

import AdminHealthRedirect from "./page";

describe("AdminHealthRedirect", () => {
  it("sends /admin/health to /admin/products", () => {
    AdminHealthRedirect();
    expect(redirectMock).toHaveBeenCalledWith("/admin/products");
  });
});
