"use client";

import { useState } from "react";
import { ConfirmDialog } from "@merqo/ui";
import { requestDowngrade } from "@/app/actions/downgrade";

/** Confirm a cancellation request and show the result inline. */
export function DowngradeButton({ slug }: { slug: string }) {
  const [done, setDone] = useState(false);

  async function onConfirm() {
    const res = await requestDowngrade(slug);
    if (!res.success) throw new Error(res.error);
    setDone(true);
  }

  if (done) {
    return (
      <p className="text-sm font-medium text-muted-foreground">
        Request sent, we&apos;ll confirm shortly.
      </p>
    );
  }

  return (
    <ConfirmDialog
      trigger={
        <button
          type="button"
          className="text-sm font-medium text-foreground hover:underline"
        >
          Request cancellation
        </button>
      }
      title="Ask to cancel your subscription?"
      description="The Merqo team will confirm and move you back to the free tier."
      cancelLabel="Never mind"
      confirmLabel="Send request"
      pendingLabel="Sending…"
      errorMessage="Unable to send your request. Please try again."
      onConfirm={onConfirm}
    />
  );
}
