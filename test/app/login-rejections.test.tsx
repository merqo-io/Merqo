// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  client: vi.fn(),
  password: vi.fn(),
  signup: vi.fn(),
  reset: vi.fn(),
  oauth: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: mocks.client }));
vi.mock("@/app/actions/auth", () => ({
  signInWithPasswordAction: mocks.password,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
import LoginPage from "@/app/login/page";

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  mocks.client.mockReturnValue({
    auth: {
      signInWithPassword: mocks.password,
      signUp: mocks.signup,
      resetPasswordForEmail: mocks.reset,
      signInWithOAuth: mocks.oauth,
    },
  });
});

it.each(["password", "signup", "reset"] as const)(
  "recovers from rejected %s requests and permits retry",
  async (method) => {
    const user = userEvent.setup();
    render(<LoginPage />);
    if (method === "signup")
      await user.click(
        screen.getByRole("button", { name: "Create an account" }),
      );
    await user.type(screen.getByLabelText("Email"), "vendor@example.com");
    await user.type(screen.getByLabelText("Password"), "safe-password");
    mocks[method].mockRejectedValueOnce(new Error("offline"));
    const labels = {
      password: "Sign in",
      signup: "Create account",
      reset: "Forgot password?",
    };
    const expected = {
      password: "Could not sign in. Try again.",
      signup: "Could not sign in. Try again.",
      reset: "Could not send a reset link. Try again.",
    };
    const label = labels[method];
    await user.click(screen.getByRole("button", { name: label }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      expected[method],
    );
    expect(screen.getByRole("button", { name: label })).toBeEnabled();
    mocks[method].mockClear();
    mocks[method].mockResolvedValue({
      data: { session: null },
      error: null,
    });
    await user.click(screen.getByRole("button", { name: label }));
    await waitFor(() => expect(mocks[method]).toHaveBeenCalledTimes(1));
  },
);

it("recovers when browser client construction throws", async () => {
  render(<LoginPage />);
  mocks.client.mockImplementationOnce(() => {
    throw new Error("configuration unavailable");
  });
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "Continue with Google" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Could not sign in. Try again.",
  );
  expect(
    screen.getByRole("button", { name: "Continue with Google" }),
  ).toBeEnabled();
});

it("shows the check-your-email screen when the email is already registered", async () => {
  const user = userEvent.setup();
  render(<LoginPage />);
  await user.click(screen.getByRole("button", { name: "Create an account" }));
  await user.type(screen.getByLabelText("Email"), "vendor@example.com");
  await user.type(screen.getByLabelText("Password"), "safe-password");
  mocks.signup.mockResolvedValueOnce({
    data: { session: null },
    error: { message: "User already registered", code: "user_already_exists" },
  });
  await user.click(screen.getByRole("button", { name: "Create account" }));
  expect(await screen.findByText("Check your email")).toBeInTheDocument();
  expect(screen.queryByRole("alert")).toBeNull();
});
