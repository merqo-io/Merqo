"use client";
import { useState } from "react";
import { toast } from "sonner";
import { useAsyncAction } from "@/hooks/use-async-action";
import { Button, Input, Label } from "@merqo/ui/primitives";
import { setBillingOpensAtAction } from "./actions";

export function BillingOpenForm({ current }: { current: string | null }) {
  const { pending, run } = useAsyncAction();
  const [date, setDate] = useState(current ?? "");

  function save(next: string | null) {
    if (pending) return;
    run(async () => {
      const res = await setBillingOpensAtAction({ date: next });
      if (res.success) {
        toast.success(
          next ? "Billing open date saved" : "Billing open date cleared",
        );
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save(date || null);
      }}
      className="mt-4 flex flex-wrap items-end gap-3"
    >
      <div className="space-y-1.5">
        <Label htmlFor="billing-opens">Billing opens on</Label>
        <Input
          id="billing-opens"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={pending}>
        Save date
      </Button>
      {current && (
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => {
            setDate("");
            save(null);
          }}
        >
          Clear date
        </Button>
      )}
    </form>
  );
}
