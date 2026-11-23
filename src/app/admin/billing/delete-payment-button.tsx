"use client";
import { Button } from "@merqo/ui/primitives";
import { ConfirmAdminAction } from "../confirm-admin-action";
import { deletePaymentAction } from "./payment-actions";

export function DeletePaymentButton({
  id,
  email,
}: {
  id: string;
  email?: string;
}) {
  return (
    <ConfirmAdminAction
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="xs"
          aria-label="Delete this payment"
          className="text-muted-foreground hover:text-destructive"
        >
          Delete
        </Button>
      }
      title={<>Delete this payment?</>}
      description={<>It is removed from the ledger and the running total.</>}
      action={() => deletePaymentAction({ id, email })}
      successMessage="Payment deleted"
      confirmLabel="Delete"
      pendingLabel="Deleting…"
    />
  );
}
