"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { passwordChangeSchema } from "@/lib/schemas";
import { authErrorCopy, errorReasons } from "@/lib/auth-error-copy";
import { AuthShell, PasswordRequirementsHint } from "@merqo/ui";
import { Button, Input, Label } from "@merqo/ui/primitives";
import { Wordmark } from "@/components/brand/wordmark";

// Reached from the password-reset email → /auth/callback establishes a recovery
// session and forwards here. We update the password on that session, then land
// the user on the dashboard.
export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    const parsed = passwordChangeSchema.safeParse({ password, confirm });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your password");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: parsed.data.password,
      });
      if (updateError) {
        setError(
          authErrorCopy(
            updateError.message,
            "Could not update your password. Try again.",
            updateError.code,
            errorReasons(updateError),
          ),
        );
        return;
      }
      router.push("/post-login");
      router.refresh();
    } catch {
      setError("Could not update your password. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      wordmark={<Wordmark className="text-3xl" />}
      title="Choose a new password"
      subtitle="Enter it twice to confirm."
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <Label
              htmlFor="password"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              New password
            </Label>
            <PasswordRequirementsHint />
          </div>
          <Input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            placeholder="••••••••"
            className="h-11 rounded-xl"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="confirm"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Confirm password
          </Label>
          <Input
            id="confirm"
            type="password"
            required
            autoComplete="new-password"
            placeholder="••••••••"
            className="h-11 rounded-xl"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}
        <Button
          type="submit"
          size="lg"
          className="h-12 w-full rounded-xl text-base font-semibold"
          disabled={busy}
        >
          {busy ? "Saving…" : "Update password"}
        </Button>
      </form>
    </AuthShell>
  );
}
