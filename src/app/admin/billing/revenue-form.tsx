"use client";
import { useState } from "react";
import { toast } from "sonner";
import { useAsyncAction } from "@/hooks/use-async-action";
import { Button, Input, Label } from "@merqo/ui/primitives";
import { setRevenueCapAction } from "./payment-actions";

export function RevenueCapForm({
  capDollars,
  windowStart,
  defaultWindowStart,
}: {
  capDollars: string;
  windowStart: string | null;
  defaultWindowStart: string;
}) {
  const { pending, run } = useAsyncAction();
  const [cap, setCap] = useState(capDollars);
  const [start, setStart] = useState(windowStart ?? "");

  function save(nextCap: string, nextStart: string) {
    if (pending) return;
    run(async () => {
      const res = await setRevenueCapAction({
        cap: nextCap,
        windowStart: nextStart,
      });
      if (res.success) toast.success("Revenue settings saved");
      else toast.error(res.error);
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save(cap.trim(), start);
      }}
      className="mt-4 flex flex-wrap items-end gap-3"
    >
      <div className="space-y-1.5">
        <Label htmlFor="revenue-cap">Cap (S$)</Label>
        <Input
          id="revenue-cap"
          inputMode="decimal"
          placeholder="No cap"
          value={cap}
          onChange={(e) => setCap(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="revenue-window">
          Counting from (default {defaultWindowStart})
        </Label>
        <Input
          id="revenue-window"
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={pending}>
        Save
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() => {
          setCap("");
          save("", start);
        }}
      >
        Clear cap
      </Button>
    </form>
  );
}
