"use client";

import type { ReactNode } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@merqo/ui";

type Result = { success: true } | { success: false; error: string };
interface Props {
  trigger: ReactNode;
  title: ReactNode;
  description: ReactNode;
  action: () => Promise<Result>;
  successMessage: string;
  confirmLabel: string;
  pendingLabel: string;
}

/**
 * Adapts the admin server actions' `{ success, error }` result to
 * `ConfirmDialog`, which signals failure by throwing and leaves the success
 * toast to the caller. Kept so the six call sites don't each repeat that glue.
 */
export function ConfirmAdminAction({
  trigger,
  title,
  description,
  action,
  successMessage,
  confirmLabel,
  pendingLabel,
}: Props) {
  async function onConfirm() {
    const result = await action();
    if (!result.success) throw new Error(result.error);
    toast.success(successMessage);
  }
  return (
    <ConfirmDialog
      trigger={trigger}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      pendingLabel={pendingLabel}
      variant="destructive"
      onConfirm={onConfirm}
    />
  );
}
