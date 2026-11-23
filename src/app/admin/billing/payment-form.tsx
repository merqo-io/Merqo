"use client";
import { useState } from "react";
import { toast } from "sonner";
import { useAsyncAction } from "@/hooks/use-async-action";
import { Button, Input, Label } from "@merqo/ui/primitives";
import { recordPaymentAction } from "./payment-actions";

const METHODS = [
  { value: "paynow", label: "PayNow" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "other", label: "Other" },
] as const;

type Method = (typeof METHODS)[number]["value"];

export function PaymentForm({
  fixedEmail,
  today,
}: {
  fixedEmail?: string;
  today: string;
}) {
  const { pending, run } = useAsyncAction();
  const [email, setEmail] = useState(fixedEmail ?? "");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [method, setMethod] = useState<Method>("paynow");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    run(async () => {
      const res = await recordPaymentAction({
        email,
        amount,
        date,
        method,
        reference,
        note,
      });
      if (res.success) {
        toast.success("Payment recorded");
        setAmount("");
        setReference("");
        setNote("");
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-3">
      {!fixedEmail && (
        <div className="space-y-1.5">
          <Label htmlFor="payment-email">Vendor email</Label>
          <Input
            id="payment-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="payment-amount">Amount (S$)</Label>
        <Input
          id="payment-amount"
          inputMode="decimal"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="payment-date">Received on</Label>
        <Input
          id="payment-date"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="payment-method">Method</Label>
        <select
          id="payment-method"
          value={method}
          onChange={(e) => setMethod(e.target.value as Method)}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        >
          {METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="payment-reference">Reference</Label>
        <Input
          id="payment-reference"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="payment-note">Note</Label>
        <Input
          id="payment-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <div className="sm:col-span-3">
        <Button type="submit" disabled={pending}>
          Record payment
        </Button>
      </div>
    </form>
  );
}
