// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const search = vi.hoisted(() => ({ value: "" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(search.value),
}));
const resetPasswordForEmail = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { resetPasswordForEmail } }),
}));
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

const tap = (user: ReturnType<typeof userEvent.setup>, target: HTMLElement) =>
  user.pointer({ keys: "[TouchA]", target });

it("switches between sign-in and sign-up by touch from the shell footer", async () => {
  const user = userEvent.setup();
  render(<LoginPage />);
  expect(
    screen.getByRole("heading", { level: 1, name: "Welcome back" }),
  ).toBeInTheDocument();
  await tap(user, screen.getByRole("button", { name: "Create an account" }));
  expect(
    screen.getByRole("heading", { level: 1, name: "Create your account" }),
  ).toBeInTheDocument();
  await tap(user, screen.getByRole("button", { name: "Sign in" }));
  expect(
    screen.getByRole("heading", { level: 1, name: "Welcome back" }),
  ).toBeInTheDocument();
});

it("shows the password hint only in sign-up mode and opens it by touch", async () => {
  const user = userEvent.setup();
  render(<LoginPage />);
  expect(
    screen.queryByRole("button", { name: "Password requirements" }),
  ).toBeNull();
  await tap(user, screen.getByRole("button", { name: "Create an account" }));
  await tap(
    user,
    screen.getByRole("button", { name: "Password requirements" }),
  );
  expect(
    await screen.findByText(/Use at least 8 characters/),
  ).toBeInTheDocument();
});

it("shows the check-your-email state after a reset link and returns by touch", async () => {
  resetPasswordForEmail.mockResolvedValue({ error: null });
  const user = userEvent.setup();
  render(<LoginPage />);
  await user.type(screen.getByLabelText("Email"), "a@business.sg");
  await tap(user, screen.getByRole("button", { name: "Forgot password?" }));
  expect(
    await screen.findByRole("heading", { level: 1, name: "Check your email" }),
  ).toBeInTheDocument();
  expect(screen.getByText("a@business.sg")).toBeInTheDocument();
  await tap(user, screen.getByRole("button", { name: "Back to sign in" }));
  expect(
    screen.getByRole("heading", { level: 1, name: "Welcome back" }),
  ).toBeInTheDocument();
});
