"use client";

import Link from "next/link";
import { Toaster } from "sonner";
import { AppLinkProvider } from "@merqo/ui";
import { TooltipProvider } from "@merqo/ui/primitives";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppLinkProvider component={Link}>
      <TooltipProvider delayDuration={200}>
        {children}
        <Toaster position="top-right" richColors />
      </TooltipProvider>
    </AppLinkProvider>
  );
}
