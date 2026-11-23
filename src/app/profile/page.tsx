import Link from "next/link";
import { BackButton } from "@merqo/ui";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { formatFounderNumber } from "@/lib/entitlements/founder";
import { loadFounderNumber } from "@/lib/entitlements/store";
import { loadVendorTrial } from "@/lib/entitlements/trial-store";
import { isTrialLive, trialDaysLeft } from "@/lib/entitlements/trial";
import { getAvatarUrl, getDisplayName } from "@/lib/account";
import { getOrCreateVendorProfile } from "@/lib/merqo-vendor-profile";
import { ProfileForm } from "./profile-form";
import { VendorTelegramConnect } from "./vendor-telegram-connect";

export const revalidate = 0;

export const metadata = { title: "Profile" };

// Deliberately NOT under /dashboard: AccountMenu (and therefore the Profile
// link) is shared by both the vendor dashboard and the admin console. Gated by
// "signed in" only, not requireMerqoTeam()'s stricter check.
export default async function ProfilePage() {
  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.getUser();
  const user = error ? null : data.user;
  if (!user) redirect("/login");

  const [profile, { data: vendorTelegram }] = await Promise.all([
    getOrCreateVendorProfile(supabase, user.id, null),
    supabase
      .from("vendor_telegram")
      .select("vendor_id")
      .eq("vendor_id", user.id)
      .maybeSingle(),
  ]);

  const [founderNumber, trial] = await Promise.all([
    loadFounderNumber(user.id).catch(() => null),
    loadVendorTrial(user.id).catch(() => null),
  ]);
  // eslint-disable-next-line react-hooks/purity -- the wall clock is read once per request on purpose
  const nowMs = Date.now();
  const trialDays =
    trial && isTrialLive(trial, nowMs) ? trialDaysLeft(trial, nowMs) : 0;

  return (
    <div className="mx-auto max-w-lg space-y-8 px-5 py-7 md:max-w-4xl">
      <header>
        <BackButton href="/dashboard" label="Dashboard" LinkComponent={Link} />
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Your account
        </p>
        <h1 className="font-display text-3xl font-semibold leading-none sm:text-4xl">
          Profile
        </h1>
        {founderNumber !== null && (
          <p className="mt-2 inline-block rounded-full bg-secondary px-3 py-1 text-xs font-semibold">
            Founding merchant {formatFounderNumber(founderNumber)}
          </p>
        )}
        {trialDays > 0 && (
          <p className="mt-2 inline-block rounded-full bg-secondary px-3 py-1 text-xs font-semibold">
            Pro trial: {trialDays} {trialDays === 1 ? "day" : "days"} left
          </p>
        )}
        <p className="mt-2 text-sm text-muted-foreground">
          Your business name, icon, display name and password. Each section
          saves on its own.
        </p>
      </header>

      <ProfileForm
        stallName={profile.stall_name}
        displayName={getDisplayName(user) ?? ""}
        email={user.email ?? ""}
        vendorId={user.id}
        avatarUrl={getAvatarUrl(user)}
        socialLinks={profile.social_links}
      />

      {/* Single-column slot, deliberately outside ProfileForm's own
          TwoColumnSections shape — a narrow settings block, not a paired
          field group (see the vendor-connect design spec). */}
      <VendorTelegramConnect connected={!!vendorTelegram} />
    </div>
  );
}
