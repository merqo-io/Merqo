/**
 * Data for the landing "kit stacker" graph: four standalone kits and the
 * integrations that exist between them. Positions are fixed (art-directed, not physics) in a
 * stable viewBox; edges render only when BOTH their endpoints are stacked. No kit
 * is a required flagship — the graph shows connections, not dependencies.
 * Display-only. `status` is derived from kits.ts (not hand-duplicated here)
 * so the graph can't drift out of sync with the real readiness.
 */

import { KITS, type KitStatus } from "@/lib/kits";

export type KitNode = {
  slug: string;
  /** Short label shown on the node, e.g. "Queue". */
  short: string;
  status: KitStatus;
  x: number;
  y: number;
};

export type KitEdge = {
  from: string;
  to: string;
  /** 1-word chip shown at the edge midpoint. */
  label: string;
  /** Full sentence for the tooltip + the screen-reader summary. */
  desc: string;
};

export const GRAPH_VIEWBOX = { w: 520, h: 440 };

type NodeLayout = Omit<KitNode, "status">;

const NODE_LAYOUT: NodeLayout[] = [
  { slug: "qkit", short: "Queue", x: 260, y: 90 },
  { slug: "paykit", short: "Payments", x: 120, y: 240 },
  { slug: "loopkit", short: "Loyalty", x: 400, y: 240 },
  { slug: "stockkit", short: "Stock", x: 260, y: 370 },
];

const STATUS_BY_SLUG = new Map(KITS.map((k) => [k.slug, k.status]));

export const KIT_NODES: KitNode[] = NODE_LAYOUT.map((n) => ({
  ...n,
  status: STATUS_BY_SLUG.get(n.slug) ?? "in-build",
}));

/** Only links that exist in the kits today: qkit shows a paykit PayNow QR,
 *  and a qkit order page can offer a loopkit stamp. */
export const KIT_EDGES: KitEdge[] = [
  {
    from: "qkit",
    to: "loopkit",
    label: "stamps",
    desc: "Customers can claim a loyalty stamp from their order page.",
  },
  {
    from: "paykit",
    to: "qkit",
    label: "pay",
    desc: "Customers pay by PayNow QR on the order page, and you confirm.",
  },
];

/** The kit the stacker starts (and resets) with — qkit, the one being piloted. It is a
 *  sensible starting point, NOT a required anchor: it can be unstacked like any
 *  other kit (no flagship). */
export const DEFAULT_STACKED = "qkit";

export function nodeBySlug(slug: string): KitNode | undefined {
  return KIT_NODES.find((n) => n.slug === slug);
}

/** Edges whose both endpoints are currently stacked. */
export function activeEdges(stacked: ReadonlySet<string>): KitEdge[] {
  return KIT_EDGES.filter((e) => stacked.has(e.from) && stacked.has(e.to));
}
