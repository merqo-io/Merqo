import { getSwitchKits } from "@merqo/ui";
import { requireVendorSession } from "@/lib/vendor";
import { getAvatarUrl } from "@/lib/account";
import { DashboardNav } from "@/components/dashboard-nav";
import { DashboardTour } from "@/components/dashboard-tour";
import { Footer } from "@/components/landing/footer";
import { createServerClient } from "@/lib/supabase/server";
import { stampTourSeen } from "@/lib/tour-prefs";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Gate every /dashboard route once here (signed-in only); the page re-derives
  // links cheaply.
  const { user, isTeam } = await requireVendorSession();

  // A fresh user has no dashboard_prefs row at all yet (unlike a plain
  // column-on-an-existing-row, this table starts empty) — maybeSingle()
  // treats "no row" the same as "never marked seen".
  const supabase = await createServerClient();
  const { data: prefs } = await supabase
    .from("dashboard_prefs")
    .select("tour_seen_at")
    .eq("user_id", user.id)
    .maybeSingle();

  // Durable "start" stamp, in addition to dashboard-tour.tsx's client-fired
  // one: this layout wraps every /dashboard/* route, so stamping here —
  // synchronously, as part of this request — lands before the response is
  // even sent, no matter what happens client-side afterwards. See
  // tour-actions.ts's stampTourSeen/markTourSeen comments for the hard-
  // navigation race this closes.
  if (!prefs?.tour_seen_at) {
    await stampTourSeen(supabase, user.id);
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* `contents`: a sticky header needs the full-height parent as its box. */}
      <div className="contents print:hidden">
        <DashboardNav
          homeHref="/dashboard"
          homeLabel="merqo dashboard home"
          navLinks={[{ href: "/dashboard", label: "Dashboard" }]}
          email={user.email}
          avatarUrl={getAvatarUrl(user)}
          switchTo={
            isTeam ? { href: "/admin", label: "Go to admin" } : undefined
          }
          // "merqo" is not a kit slug, so the whole kit family comes back:
          // the hub is where a vendor jumps into any kit.
          switchKits={getSwitchKits("merqo")}
        />
      </div>
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-8">
        {children}
      </main>
      <div className="contents print:hidden">
        <Footer showSignIn={false} />
      </div>
      <DashboardTour seen={!!prefs?.tour_seen_at} />
    </div>
  );
}
