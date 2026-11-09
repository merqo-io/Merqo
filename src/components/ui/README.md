# UI primitives

Only `badge.tsx` lives here: the shared badge in `@merqo/ui/primitives` has no `gold` variant and uses a different destructive treatment, so merqo keeps its own. Every other shadcn primitive (button, input, label, select, switch, tooltip, and cn) is imported from `@merqo/ui/primitives`; do not add a local copy.
