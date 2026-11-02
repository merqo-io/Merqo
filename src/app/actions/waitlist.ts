"use server";
import { headers } from "next/headers";
import { z } from "zod";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import type { WaitlistState } from "@/lib/waitlist-state";
import { addToWaitlist } from "@/lib/waitlist";
import { WAITLISTABLE_SLUGS } from "@/lib/kits";

/** Public waitlist (/waitlist). Email comes from the form (no auth). */
const schema = z.object({
  email: z.string().trim().toLowerCase().max(254).email(),
  slug: z.enum(WAITLISTABLE_SLUGS as [string, ...string[]]),
});

export async function joinKitWaitlist(
  _prev: WaitlistState,
  formData: FormData,
): Promise<WaitlistState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    slug: formData.get("slug"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Enter a valid email address." };
  }
  // Fails open: an unreachable counter must not block a public signup.
  const allowed = await rateLimit({
    bucket: "waitlist",
    key: clientIp(await headers()),
    limit: 5,
    windowSeconds: 3600,
    failOpen: true,
  });
  if (!allowed) {
    return {
      status: "error",
      message: "Too many attempts. Try again later.",
    };
  }
  try {
    await addToWaitlist(parsed.data.email, parsed.data.slug);
    return {
      status: "success",
      message: "You're on the list, we'll email you when it opens.",
    };
  } catch {
    return {
      status: "error",
      message: "Something went wrong. Try again in a moment.",
    };
  }
}
