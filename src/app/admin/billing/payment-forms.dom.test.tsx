// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  setCap: vi.fn(),
  record: vi.fn(),
  remove: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock("./payment-actions", () => ({
  setRevenueCapAction: mocks.setCap,
  recordPaymentAction: mocks.record,
  deletePaymentAction: mocks.remove,
}));
vi.mock("sonner", () => ({
  toast: { success: mocks.success, error: mocks.error },
}));

import { PaymentForm } from "./payment-form";
import { PaymentList } from "./payment-list";
import { RevenueCapForm } from "./revenue-form";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.setCap.mockResolvedValue({ success: true });
  mocks.record.mockResolvedValue({ success: true });
  mocks.remove.mockResolvedValue({ success: true });
});

describe("RevenueCapForm", () => {
  it("saves the typed cap and window", async () => {
    const user = userEvent.setup();
    render(
      <RevenueCapForm
        capDollars=""
        windowStart={null}
        defaultWindowStart="2026-01-01"
      />,
    );
    await user.type(screen.getByLabelText("Cap (S$)"), "1234.56");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(mocks.setCap).toHaveBeenCalledWith({
        cap: "1234.56",
        windowStart: "",
      }),
    );
    expect(mocks.success).toHaveBeenCalled();
  });

  it("clears the cap", async () => {
    const user = userEvent.setup();
    render(
      <RevenueCapForm
        capDollars="50.00"
        windowStart="2026-02-01"
        defaultWindowStart="2026-01-01"
      />,
    );
    await user.click(screen.getByRole("button", { name: "Clear cap" }));
    await waitFor(() =>
      expect(mocks.setCap).toHaveBeenCalledWith({
        cap: "",
        windowStart: "2026-02-01",
      }),
    );
  });

  it("shows the error when saving fails", async () => {
    mocks.setCap.mockResolvedValue({ success: false, error: "nope" });
    const user = userEvent.setup();
    render(
      <RevenueCapForm
        capDollars="5"
        windowStart={null}
        defaultWindowStart="2026-01-01"
      />,
    );
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("nope"));
  });
});

describe("PaymentForm", () => {
  it("records a payment and clears the amount", async () => {
    const user = userEvent.setup();
    render(<PaymentForm today="2026-03-01" />);
    await user.type(screen.getByLabelText("Vendor email"), "v@t.sg");
    await user.type(screen.getByLabelText("Amount (S$)"), "12.50");
    await user.selectOptions(screen.getByLabelText("Method"), "other");
    await user.type(screen.getByLabelText("Reference"), "r1");
    await user.click(screen.getByRole("button", { name: "Record payment" }));
    await waitFor(() =>
      expect(mocks.record).toHaveBeenCalledWith({
        email: "v@t.sg",
        amount: "12.50",
        date: "2026-03-01",
        method: "other",
        reference: "r1",
        note: "",
      }),
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Amount (S$)")).toHaveValue(""),
    );
  });

  it("uses the fixed vendor email without an email field", async () => {
    const user = userEvent.setup();
    render(<PaymentForm fixedEmail="v@t.sg" today="2026-03-01" />);
    expect(screen.queryByLabelText("Vendor email")).toBeNull();
    await user.type(screen.getByLabelText("Amount (S$)"), "1");
    await user.type(screen.getByLabelText("Note"), "hi");
    await user.click(screen.getByRole("button", { name: "Record payment" }));
    await waitFor(() =>
      expect(mocks.record).toHaveBeenCalledWith(
        expect.objectContaining({ email: "v@t.sg", note: "hi" }),
      ),
    );
  });

  it("shows the error when recording fails", async () => {
    mocks.record.mockResolvedValue({ success: false, error: "nope" });
    const user = userEvent.setup();
    render(<PaymentForm fixedEmail="v@t.sg" today="2026-03-01" />);
    await user.type(screen.getByLabelText("Amount (S$)"), "1");
    await user.click(screen.getByRole("button", { name: "Record payment" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("nope"));
  });
});

describe("PaymentList", () => {
  const row = {
    id: "5f0d2f0e-8c3b-4c53-9c7e-0b0f5d3e9a11",
    vendorEmail: "v@t.sg",
    amountCents: 123456,
    receivedOn: "2026-03-01",
    method: "bank_transfer" as const,
    reference: "ref-1",
    note: null,
  };

  it("lists a payment with its vendor, method and reference", () => {
    render(<PaymentList payments={[row]} showVendor />);
    expect(screen.getByText("S$1234.56")).toBeInTheDocument();
    expect(screen.getByText("Bank transfer")).toBeInTheDocument();
    expect(screen.getByText("v@t.sg")).toBeInTheDocument();
    expect(screen.getByText("ref-1")).toBeInTheDocument();
  });

  it("names a payment whose vendor was removed", () => {
    render(
      <PaymentList payments={[{ ...row, vendorEmail: null }]} showVendor />,
    );
    expect(screen.getByText("Removed vendor")).toBeInTheDocument();
  });

  it("shows an empty state", () => {
    render(<PaymentList payments={[]} showVendor={false} />);
    expect(screen.getByText("No payments recorded yet.")).toBeInTheDocument();
  });

  it("deletes only after confirming", async () => {
    const user = userEvent.setup();
    render(<PaymentList payments={[row]} email="v@t.sg" showVendor={false} />);
    await user.click(
      screen.getByRole("button", { name: "Delete this payment" }),
    );
    expect(mocks.remove).not.toHaveBeenCalled();
    await user.click(await screen.findByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(mocks.remove).toHaveBeenCalledWith({
        id: row.id,
        email: "v@t.sg",
      }),
    );
  });
});
