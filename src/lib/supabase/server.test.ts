import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createServerClient } = vi.hoisted(() => ({
  createServerClient: vi.fn().mockReturnValue({}),
}));
vi.mock("@supabase/ssr", () => ({ createServerClient }));
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [], set: vi.fn() }),
}));

import {
  createServerClient as createClient,
  createServiceClient,
} from "./server";

type Options = {
  db?: { schema?: string };
  cookies: { getAll: () => unknown[]; setAll: (c: unknown[]) => void };
};
const options = () => createServerClient.mock.calls[0][2] as Options;

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "pub");
});

afterEach(() => {
  vi.unstubAllEnvs();
  createServerClient.mockClear();
});

describe("server clients", () => {
  it("defaults the cookie-bound client to the merqo schema", async () => {
    await createClient();
    expect(options().db?.schema).toBe("merqo");
  });

  it("builds the service client on the merqo schema with an empty cookie adapter", async () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", "secret");
    await createServiceClient();
    expect(options().db?.schema).toBe("merqo");
    expect(options().cookies.getAll()).toEqual([]);
    expect(() => options().cookies.setAll([{}])).not.toThrow();
  });

  it("rejects instead of throwing when the secret key is missing", async () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    await expect(createServiceClient()).rejects.toThrow(/SUPABASE_SECRET_KEY/);
  });
});
