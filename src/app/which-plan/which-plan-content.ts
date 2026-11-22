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
