import Link from "next/link";
import { requireMerqoTeam } from "@/lib/team";
import { hasActiveVendorAccess } from "@/lib/vendor";
import { getAvatarUrl } from "@/lib/account";
import { DashboardNav } from "@/components/dashboard-nav";
import { Footer } from "@/components/landing/footer";

const ADMIN_LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/vendors", label: "Vendors" },
  { href: "/admin/requests", label: "Requests" },
  { href: "/admin/products", label: "Products" },
];

// The shared account menu takes one extra link and a "Switch kits" group, so
// the occasional places sit in a quiet row under the nav instead.
const SECONDARY_LINKS = [
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
          // Eight links needed about 1083px; four drop roughly 300px, still over md (768px), so lg.
          collapseBelow="lg"
          navLinks={ADMIN_LINKS}
          email={user.email}
          avatarUrl={getAvatarUrl(user)}
          switchTo={
            canSwitch
              ? { href: "/dashboard", label: "View vendor dashboard" }
              : undefined
          }
        />
        <nav
          aria-label="More admin pages"
          className="border-b bg-secondary/30 print:hidden"
        >
          <ul className="mx-auto flex max-w-7xl items-center gap-5 px-5 py-2 text-sm text-muted-foreground">
            {SECONDARY_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-foreground">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="w-full flex-1">{children}</div>
      <div className="contents print:hidden">
        <Footer showSignIn={false} />
      </div>
    </div>
  );
}
