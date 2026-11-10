/**
 * The Merqo kit family: the source of truth for the landing page and the
 * dashboard's kit discovery. Static on purpose: no DB read keeps the landing's
 * LCP fast and lets it render even while Supabase is half-provisioned. Every
 * kit here must have a matching `merqo.products` row for the vendor_links FK.
 */

/** Readiness ladder. `piloting` needs a real pilot in the field; every kit
 *  without that proof is `in-build`. */
export type KitStatus = "piloting" | "in-build";

export const KIT_STATUS_LABEL: Record<KitStatus, string> = {
  piloting: "Piloting",
  "in-build": "In build",
};

/** One line under each kit's badge saying what the badge means. */
export const KIT_STATUS_EXPLAINER: Record<KitStatus, string> = {
  piloting: "Running with a few vendors",
  "in-build": "Built, not yet tried with vendors",
};

/** The only pricing statement on the hub's public pages. */
export const PRICING_LINE =
  "Free during the pilot. If we start charging, you'll get at least 30 days' notice first.";

export type Kit = {
  slug: string;
  name: string;
  /** One-line, plain-language "what it does" for a non-technical vendor. */
  tagline: string;
  /** 2-3 sentence explanation for the dashboard's discovery cards. */
  description: string;
  /** 3-4 short "what you get" bullets for the dashboard's discovery cards. */
  features: string[];
  status: KitStatus;
  /** Where the CTA sends the vendor. */
  href: string;
};

/** Set NEXT_PUBLIC_QKIT_URL per environment to override (e.g. a preview deploy). */
const QKIT_URL = process.env.NEXT_PUBLIC_QKIT_URL ?? "https://qkit.merqo.io";

/** Set NEXT_PUBLIC_LOOPKIT_URL per environment to override. */
const LOOPKIT_URL =
  process.env.NEXT_PUBLIC_LOOPKIT_URL ?? "https://loopkit.merqo.io";

/** Set NEXT_PUBLIC_PAYKIT_URL per environment to override. */
const PAYKIT_URL =
  process.env.NEXT_PUBLIC_PAYKIT_URL ?? "https://paykit.merqo.io";

/** Set NEXT_PUBLIC_STOCKKIT_URL per environment to override. */
const STOCKKIT_URL =
  process.env.NEXT_PUBLIC_STOCKKIT_URL ?? "https://stockkit.merqo.io";

// Each kit is a standalone product on its own merqo.io subdomain.
export const KITS: Kit[] = [
  {
    slug: "qkit",
    name: "qkit",
    tagline:
      "Take orders and run your queue from a QR code. No app, no hardware.",
    description:
      "Customers scan a QR code to join your queue or place an order, no app download, no extra hardware. You get a dashboard to manage orders, track busy periods, and keep the line moving.",
    features: [
      "QR-code ordering and queueing",
      "Order dashboard",
      "Works on any phone, no app needed",
    ],
    status: "piloting",
    href: QKIT_URL,
  },
  {
    slug: "loopkit",
    name: "loopkit",
    tagline: "Stamp cards and points that bring customers back.",
    description:
      "Digital stamp cards and a points system that turns one-time buyers into regulars. Customers collect stamps or points on every visit and redeem rewards you set, no punch cards to lose.",
    features: [
      "Digital stamp cards and points",
      "Custom rewards you set",
      "Stamps for qkit orders",
    ],
    status: "in-build",
    href: LOOPKIT_URL,
  },
  {
    slug: "paykit",
    name: "paykit",
    tagline: "Show a PayNow QR, and confirm each payment when it lands.",
    description:
      'Show a PayNow QR at checkout. The customer pays in their banking app and taps "I\'ve paid", then you confirm it. The money goes straight to you, never through Merqo.',
    features: [
      "PayNow QR for each payment",
      'Customer taps "I\'ve paid"',
      "You confirm every payment",
      "Works with qkit orders",
    ],
    status: "in-build",
    href: PAYKIT_URL,
  },
  {
    slug: "stockkit",
    name: "stockkit",
    tagline: "Track stock in and out, and know what each dish really costs.",
    description:
      "Keep a count of what's on your shelves or in your kitchen, and see the true cost of every dish or product, so you know what's actually making you money.",
    features: [
      "Stock in and out",
      "Ingredient and product cost breakdown",
      "Low-stock flag on your dashboard",
    ],
    status: "in-build",
    href: STOCKKIT_URL,
  },
];

/** Kits a visitor can join the waitlist for: every kit still in build. */
export const WAITLISTABLE_SLUGS = KITS.filter(
  (k) => k.status === "in-build",
).map((k) => k.slug);
