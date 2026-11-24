export const WHICH_PLAN_TITLE = "Which plan fits you";

export const WHICH_PLAN_INTRO =
  "Merqo is free during the pilot. If paid plans are introduced, this is the plan we would suggest for each kind of vendor.";

export const PLAN_NAMES = ["Free", "Starter", "Pro", "Event Pass"] as const;

export type PlanName = (typeof PLAN_NAMES)[number];

export type PlanRow = {
  id: string;
  vendor: string;
  plan: PlanName | "Talk to us";
  why: string;
};

export const PLAN_ROWS: readonly PlanRow[] = [
  {
    id: "event-cart",
    vendor: "Event cart, one event a month or fewer",
    plan: "Event Pass",
    why: "Made for one event at a time, so you only need it when you trade.",
  },
  {
    id: "event-regular",
    vendor: "Event or market vendor, two or more events a month",
    plan: "Pro",
    why: "Regular events add up, and Pro keeps you covered every time you set up.",
  },
  {
    id: "hawker",
    vendor: "Hawker or fixed stall",
    plan: "Pro",
    why: "A stall that trades every day gets the most from the full set of features.",
  },
  {
    id: "home-based",
    vendor: "Home-based seller",
    plan: "Free",
    why: "Start on Free, then move to Starter as your orders grow.",
  },
  {
    id: "organiser",
    vendor: "Market organiser",
    plan: "Talk to us",
    why: "Organisers run a group of vendors, so we would set up a group arrangement together.",
  },
];

export const PLAN_COVERS: readonly { plan: PlanName; covers: string }[] = [
  { plan: "Free", covers: "The essentials to take orders and run your queue." },
  { plan: "Starter", covers: "More room for orders as a home business grows." },
  { plan: "Pro", covers: "The full set of features for regular trading." },
  { plan: "Event Pass", covers: "Full features for a single event." },
];

export const ORGANISER_CONTACT_HREF = "mailto:team@merqo.io";

export const PAID_TERMS_HEADING = "If paid plans are introduced";

export const PAID_TERMS: readonly string[] = [
  "Founder offer: the first 20 vendors get numbered founder spots. It closes when 20 are taken, or 60 days after paid plans open. Founders are on Pro and skip the trial.",
  "Trial: one 30-day Pro trial per vendor. It starts from your first order, not from sign-up.",
  "Pause: you can pause for up to 3 months a year. Your data is kept.",
  "Missed payment: you get a 7-day grace period, then your account goes back to Free. Your data is kept.",
  "Changing plan: an upgrade takes effect now, pro-rated. A downgrade takes effect at the end of the period.",
  "Payment is manual, by PayNow. Nothing is charged automatically.",
];

export const FOUNDER_SPOTS_NOTE =
  "See how many founder spots are left on the waitlist page.";
