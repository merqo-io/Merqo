"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireMerqoTeam } from "@/lib/team";
import { grantKit, revokeKit, recordAudit } from "@/lib/admin";
import type { ActionResult } from "@merqo/ui/kit-api";

const grantSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  slug: z.string().trim().min(1),
});

export async function grantKitAction(
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await requireMerqoTeam();
  const parsed = grantSchema.safeParse({
    email: formData.get("email"),
    slug: formData.get("slug"),
  });
  if (!parsed.success) {
    return { success: false, error: "Enter a valid email and kit." };
  }
  try {
    await grantKit(parsed.data.email, parsed.data.slug);
  } catch {
    return { success: false, error: "Could not grant access. Try again." };
  }
  await recordAudit(user.id, "grant_kit_access", null, parsed.data);
  revalidatePath("/admin/vendors");
  return { success: true };
}

export async function revokeKitAction(
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await requireMerqoTeam();
  const parsed = grantSchema.safeParse({
    email: formData.get("email"),
    slug: formData.get("slug"),
  });
  if (!parsed.success) {
    return { success: false, error: "Enter a valid email and kit." };
  }
  try {
    await revokeKit(parsed.data.email, parsed.data.slug);
  } catch {
    return { success: false, error: "Could not revoke access. Try again." };
  }
  await recordAudit(user.id, "revoke_kit_access", null, parsed.data);
  revalidatePath("/admin/vendors");
  return { success: true };
}
