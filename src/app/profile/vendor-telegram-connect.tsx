"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { VendorTelegramSection } from "@merqo/ui";
import {
  mintVendorTelegramConnectToken,
  disconnectVendorTelegram,
} from "./vendor-telegram-actions";

interface Props {
  connected: boolean;
}

/**
 * Adapts the `ActionResult`-returning server actions
 * (`vendor-telegram-actions.ts`) to `@merqo/ui`'s `VendorTelegramSection`
 * throw-on-failure prop contract — same shape as `ProfileForm`'s own
 * `res.success` → toast/throw pattern elsewhere on this page.
 */
// Name only: server error messages can carry user data, so they never reach the console.
function errorTag(err: unknown): string {
  return err instanceof Error ? err.name : "unknown";
}

export function VendorTelegramConnect({ connected }: Props) {
  const router = useRouter();

  if (connected) {
    return (
      <VendorTelegramSection
        connected
        onDisconnect={async () => {
          const res = await disconnectVendorTelegram();
          if (!res.success) throw new Error(res.error);
          router.refresh();
        }}
        onError={(err) => {
          console.error("telegram disconnect failed", errorTag(err));
          toast.error("Could not disconnect Telegram. Try again.");
        }}
      />
    );
  }

  return (
    <VendorTelegramSection
      connected={false}
      onConnect={async () => {
        const res = await mintVendorTelegramConnectToken();
        if (!res.success) throw new Error(res.error);
        return { deepLink: res.deepLink, qrSvgMarkup: res.qrSvgMarkup };
      }}
      onError={(err) => {
        console.error("telegram link failed", errorTag(err));
        toast.error("Could not create a Telegram link. Try again.");
      }}
    />
  );
}
