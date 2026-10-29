import { requireMerqoTeam } from "@/lib/team";
import { hasActiveVendorAccess } from "@/lib/vendor";
import { getAvatarUrl } from "@/lib/account";
import { DashboardNav } from "@/components/dashboard-nav";
import { Footer } from "@/components/landing/footer";

const ADMIN_LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/vendors", label: "Vendors" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/health", label: "Health" },
  { href: "/admin/team", label: "Team" },
  { href: "/admin/feedback", label: "Feedback" },
  { href: "/admin/activity", label: "Activity" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Gate every /admin route once here; child pages re-derive the user cheaply.
  const { user } = await requireMerqoTeam();
  const canSwitch = user.email
    ? await hasActiveVendorAccess(user.email)
    : false;

  return (
    <div className="flex min-h-screen flex-col">
      {/* `contents`: a sticky header needs the full-height parent as its box. */}
      <div className="contents print:hidden">
        <DashboardNav
          homeHref="/admin"
          homeLabel="merqo admin home"
          badge="Admin"
          navLinks={ADMIN_LINKS}
          email={user.email}
          avatarUrl={getAvatarUrl(user)}
          switchTo={
            canSwitch
              ? { href: "/dashboard", label: "View vendor dashboard" }
              : undefined
          }
        />
      </div>
      <div className="w-full flex-1">{children}</div>
      <div className="contents print:hidden">
        <Footer showSignIn={false} />
      </div>
    </div>
  );
}
