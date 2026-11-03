/**
 * Upper bounds for free-form strings on the kit -> merqo bearer routes. The
 * backing columns are unbounded `text`, so these exist only to stop a
 * leaked-secret caller from writing arbitrarily large rows. Each sits well
 * above real traffic (slugs like "qkit", refs like "qkit:<uuid>", E.164 phones).
 */
export const KIT_ROUTE_MAX = {
  kitSlug: 64,
  notifyRef: 128,
  phone: 32,
  docVersion: 64,
  userAgent: 512,
} as const;
