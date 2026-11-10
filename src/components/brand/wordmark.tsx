import { Wordmark as WordmarkShell } from "@merqo/ui";
import { cn } from "@merqo/ui/primitives";

/** The Merqo wordmark. The `q` carries the brand's origin (qkit / queue), so it
 *  gets the gold accent — the one recurring brand signal. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <WordmarkShell
      size="sm"
      className={cn("font-extrabold lowercase", className)}
    >
      mer<span className="text-gold">q</span>o
    </WordmarkShell>
  );
}
