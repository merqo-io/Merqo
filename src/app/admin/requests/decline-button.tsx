"use client";
import { Button } from "@merqo/ui/primitives";
import { ConfirmAdminAction } from "../confirm-admin-action";
import { declineRequestAction } from "./actions";

export function DeclineButton({
  requestId,
  email,
}: {
  requestId: string;
  email: string;
}) {
  return (
    <ConfirmAdminAction
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="xs"
          aria-label={`Decline the request from ${email}`}
          className="text-muted-foreground hover:text-destructive"
        >
          Decline
        </Button>
      }
      title={<>Decline the request from {email}?</>}
      description={
        <>The vendor keeps their current plan. They can ask again later.</>
      }
      action={() => declineRequestAction({ requestId })}
      successMessage={`Declined the request from ${email}`}
      confirmLabel="Decline"
      pendingLabel="Declining…"
    />
  );
}
