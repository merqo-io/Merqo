import { EmptyState, formatMoney } from "@merqo/ui";
import type { PaymentRow } from "@/lib/entitlements/ledger";
import { DeletePaymentButton } from "./delete-payment-button";

const METHOD_LABELS = {
  paynow: "PayNow",
  bank_transfer: "Bank transfer",
  other: "Other",
} as const;

export function PaymentList({
  payments,
  email,
  showVendor,
}: {
  payments: PaymentRow[];
  email?: string;
  showVendor: boolean;
}) {
  if (payments.length === 0) {
    return (
      <EmptyState
        size="compact"
        className="mt-3"
        title="No payments recorded yet."
      />
    );
  }
  return (
    <ul className="mt-3 space-y-2">
      {payments.map((p) => (
        <li
          key={p.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card p-3.5 text-sm shadow-sm"
        >
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-medium">{formatMoney(p.amountCents)}</span>
            <span>{p.receivedOn}</span>
            <span>{METHOD_LABELS[p.method]}</span>
            {showVendor && (
              <span className="break-all">
                {p.vendorEmail ?? "Removed vendor"}
              </span>
            )}
            {p.reference && (
              <span className="text-muted-foreground">{p.reference}</span>
            )}
          </span>
          <DeletePaymentButton id={p.id} email={email} />
        </li>
      ))}
    </ul>
  );
}
