// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const search = vi.hoisted(() => ({ value: "" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(search.value),
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));
vi.mock("@/app/actions/auth", () => ({ signInWithPasswordAction: vi.fn() }));
import LoginPage from "./page";

beforeEach(() => {
  search.value = "";
});

it("shows the expired-link message for ?error=link", () => {
  search.value = "error=link";
  render(<LoginPage />);
  expect(screen.getByRole("alert")).toHaveTextContent(
    "That link is invalid or has expired. Request a new one.",
  );
});

it("shows no error by default", () => {
  render(<LoginPage />);
  expect(screen.queryByRole("alert")).toBeNull();
});
