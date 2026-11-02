import Link from "next/link";
import { kitCardAction } from "@/lib/vendor";
import type { Kit } from "@/lib/kits";
import { ActivateKitsButton } from "./activate-kits-button";

const LINK = "text-sm font-medium text-foreground hover:underline";

/** The action on an unadded kit's discovery card: one-click add, join the
 *  waitlist, or log in on the kit itself. */
export function KitCardCta({
  kit,
  provisionable,
}: {
  kit: Kit;
  provisionable: boolean;
}) {
  const action = kitCardAction(kit, provisionable);
  if (action === "activate") {
    return (
      <ActivateKitsButton
        slugs={[kit.slug]}
        label={`Add ${kit.name}`}
        variant="secondary"
        size="sm"
      />
    );
  }
  if (action === "waitlist") {
    return (
      <Link href={`/waitlist?kit=${kit.slug}`} className={LINK}>
        Join the waitlist
      </Link>
    );
  }
  return (
    <a
      href={`${kit.href}/login`}
      target="_blank"
      rel="noreferrer"
      className={LINK}
    >
      Add {kit.name}
    </a>
  );
}
