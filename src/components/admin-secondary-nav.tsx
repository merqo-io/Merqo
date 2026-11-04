"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive } from "@/components/dashboard-nav";

type SecondaryLink = { href: string; label: string };

/** Quiet second nav row for occasional admin pages, with an active-page cue. */
export function AdminSecondaryNav({ links }: { links: SecondaryLink[] }) {
  const path = usePathname();
  return (
    <nav
      aria-label="More admin pages"
      className="border-b bg-secondary/30 print:hidden"
    >
      {/* flex-wrap so the row never forces horizontal page scroll at 375px. */}
      <ul className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-1 px-5 py-2 text-sm text-muted-foreground">
        {links.map((l) => {
          const active = isActive(path, l.href, "/admin");
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "font-medium text-foreground"
                    : "hover:text-foreground"
                }
              >
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
