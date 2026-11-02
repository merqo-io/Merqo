"use server";
import { z } from "zod";
import type { WaitlistState } from "@/lib/waitlist-state";
import { addToWaitlist } from "@/lib/waitlist";
import { WAITLISTABLE_SLUGS } from "@/lib/kits";

/** Public waitlist (/waitlist). Email comes from the form (no auth). */
const schema = z.object({
  email: z.string().trim().toLowerCase().max(254).email(),
  slug: z.enum(WAITLISTABLE_SLUGS as [string, ...string[]]),
  // An unticked checkbox is absent from FormData; a ticked one posts "on".
  updatesOptIn: z.literal("on").nullish(),
});

export async function joinKitWaitlist(
  _prev: WaitlistState,
  formData: FormData,
): Promise<WaitlistState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    slug: formData.get("slug"),
    updatesOptIn: formData.get("updatesOptIn"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Enter a valid email address." };
  }
  try {
    await addToWaitlist(
      parsed.data.email,
      parsed.data.slug,
      parsed.data.updatesOptIn === "on",
    );
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
