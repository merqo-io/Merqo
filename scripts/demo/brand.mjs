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
  // Init script run on every recorded page. The pilot is free, so the Pro
  // upsell rows on the kit cards must never be on camera. Hidden by text since
  // the clip must not need app changes or test ids.
  hideOffCameraScript: `(() => {
    const UPSELL = /^(Request upgrade|Pro saves)/;
    const sweep = () => {
      for (const el of document.querySelectorAll("button, a, p, div, span")) {
        const text = (el.textContent || "").trim();
        if (!UPSELL.test(text) || el.style.display === "none") continue;
        const inner = [...el.children].some((c) => UPSELL.test((c.textContent || "").trim()));
        if (!inner) el.style.display = "none";
      }
    };
    new MutationObserver(sweep).observe(document, { childList: true, subtree: true, characterData: true });
    document.addEventListener("DOMContentLoaded", sweep);
    setInterval(sweep, 200);
  })();`,
};
