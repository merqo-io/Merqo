import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";

const readSpotsLeft = unstable_cache(
  async (): Promise<number> => {
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { db: { schema: "merqo" }, auth: { persistSession: false } },
    );
    const { data, error } = await client.rpc("founder_spots_left");
    if (error || typeof data !== "number") {
      throw new Error("founder_spots_left unavailable");
    }
    return data;
  },
  ["founder-spots-left"],
  { revalidate: 300 },
);

/** Founder spots left for the public waitlist, or null when the count cannot
 *  be read (for example before the migration is applied). A failed read is
 *  thrown inside the cache so it is never stored. */
export async function getFounderSpotsLeft(): Promise<number | null> {
  try {
    return await readSpotsLeft();
  } catch {
    return null;
  }
}
