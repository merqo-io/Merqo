// Kit-specific constants for the generic demo core (filters, compose, harness).
// Keeping them here lets the core files stay identical across kits so they can
// later be extracted into a shared package.

export const BRAND = {
  wordmark: "merqo",
  outroLine: "Your Merqo kits in one dashboard",
  tmpPrefix: "merqo-demo-",
  // Docker container of the local Postgres, used when the host has no psql.
  dbContainer: "supabase_db_merqo",
  // Placeholder of price inputs the recorder blurs when a scene masks prices;
  // merqo has no price fields on camera.
  priceInputPlaceholder: "__none__",
  // Init script run on every recorded page to hide kit-specific upsells.
  hideOffCameraScript: "",
};
