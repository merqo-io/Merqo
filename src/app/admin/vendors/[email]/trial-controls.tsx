"use client";
import { useState } from "react";
import { toast } from "sonner";
import { useAsyncAction } from "@/hooks/use-async-action";
import { Button, Input, Label } from "@merqo/ui/primitives";
import {
  checkFirstOrderAction,
  overrideTrialAction,
  setTrialUenAction,
} from "./trial-actions";

export function TrialControls({
  email,
  paynowUen,
  canOverride,
}: {
  email: string;
  paynowUen: string | null;
  canOverride: boolean;
}) {
  const { pending, run } = useAsyncAction();
  const [uen, setUen] = useState(paynowUen ?? "");
  const [reason, setReason] = useState("");

  const uenValue = uen.trim() === "" ? undefined : uen;

  function check() {
    if (pending) return;
    run(async () => {
      const res = await checkFirstOrderAction({ email, paynowUen: uenValue });
      if (res.success) toast.success(res.message);
      else toast.error(res.error);
    });
  }

  function saveUen() {
    if (pending) return;
    run(async () => {
      const res = await setTrialUenAction({ email, paynowUen: uen });
      if (res.success) toast.success(res.message);
      else toast.error(res.error);
    });
  }

  function override(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    run(async () => {
      const res = await overrideTrialAction({
        email,
        reason,
        paynowUen: uenValue,
      });
      if (res.success) {
        toast.success("Trial started");
        setReason("");
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="mt-4 space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="trial-uen">PayNow / UEN</Label>
        <div className="flex flex-wrap gap-2">
          <Input
            id="trial-uen"
            value={uen}
            onChange={(e) => setUen(e.target.value)}
            maxLength={12}
            className="w-48"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={saveUen}
            disabled={pending || uenValue === undefined}
          >
            Save and re-check
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={check}
            disabled={pending}
          >
            Check first order now
          </Button>
        </div>
      </div>

      {canOverride && (
        <form onSubmit={override} className="space-y-1.5">
          <Label htmlFor="trial-reason">Override reason</Label>
          <div className="flex flex-wrap gap-2">
            <Input
              id="trial-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              required
              className="min-w-64 flex-1"
            />
            <Button type="submit" size="sm" disabled={pending}>
              Override and start trial
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
