"use client";

import { useState } from "react";
import { TermsAcceptanceCheckbox } from "@merqo/ui";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/actions/auth";
import { acceptLegalTerms } from "./actions";

export function AcceptForm({ next }: { next: string }) {
  const [checked, setChecked] = useState(false);

  return (
    <div className="space-y-4">
      <form action={acceptLegalTerms} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <TermsAcceptanceCheckbox
          checked={checked}
          onCheckedChange={setChecked}
        />
        <Button
          type="submit"
          className="w-full"
          disabled={!checked}
          aria-describedby={checked ? undefined : "accept-hint"}
        >
          Continue
        </Button>
        {!checked && (
          <p id="accept-hint" className="text-xs text-muted-foreground">
            Tick the box above to continue.
          </p>
        )}
      </form>
      {/* Separate form: nesting forms is invalid HTML. */}
      <form action={signOutAction}>
        <Button type="submit" variant="outline" className="w-full">
          Sign out
        </Button>
      </form>
    </div>
  );
}
