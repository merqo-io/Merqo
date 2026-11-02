import { KITS, type KitStatus } from "@/lib/kits";
import { cn } from "@/lib/utils";

const ORDER = KITS.map((k) => ({ slug: k.slug, status: k.status }));

const DOT_CLASS: Record<KitStatus, string> = {
  piloting: "bg-gold",
  "in-build": "bg-primary",
};

export function Timeline() {
  return (
    <div className="mt-6 px-1">
      <div className="relative flex items-start justify-between">
        <div className="absolute inset-x-2 top-[5px] h-px bg-border" />
        {ORDER.map((k) => (
          <div
            key={k.slug}
            className="relative flex flex-col items-center gap-1.5"
          >
            <span
              className={cn(
                "size-2.5 rounded-full ring-4 ring-card",
                DOT_CLASS[k.status],
              )}
            />
            <span
              className={cn(
                "font-mono text-[10px]",
                k.status === "piloting"
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {k.slug}
            </span>
            {k.status === "piloting" && (
              <span className="text-[9px] text-muted-foreground">pilot</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
