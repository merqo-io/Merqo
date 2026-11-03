"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { clientIp, rateLimit, UNKNOWN_IP } from "@/lib/rate-limit";
import { createServerClient } from "@/lib/supabase/server";

export async function signOutAction(): Promise<void> {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const signInSchema = z.object({
  email: z.string().trim().max(254),
  password: z.string().min(1).max(1024),
});

export type SignInResult = { error: string | null };

/**
 * Password sign-in routed through the server so attempts can be counted per
 * IP. Fails open: Supabase Auth applies its own limits underneath, so an
 * unreachable counter must not lock every vendor out of the console.
 */
export async function signInWithPasswordAction(
  input: z.input<typeof signInSchema>,
): Promise<SignInResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return { error: "Enter your email and password." };

  const ip = clientIp(await headers());
  const allowed = await rateLimit({
    bucket: "login",
    key: ip,
    unknownIp: ip === UNKNOWN_IP,
    limit: 10,
    windowSeconds: 900,
    failOpen: true,
  });
  if (!allowed) {
    return { error: "Too many sign-in attempts. Try again in a few minutes." };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  return { error: error ? error.message : null };
}
