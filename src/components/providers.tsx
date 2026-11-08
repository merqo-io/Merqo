"use client";

import { Toaster } from "sonner";
import { TooltipProvider } from "@merqo/ui/primitives";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={200}>
      {children}
      <Toaster position="top-right" richColors />
    </TooltipProvider>
  );
}
