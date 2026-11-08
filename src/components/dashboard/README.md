# dashboard

## Purpose

Components specific to the vendor dashboard (`/dashboard`) — kit activation,
discovery cards, and stat tiles — as distinct from `src/components/landing/`
(marketing) and `src/app/admin/`'s own local components.

## Contents

- `activate-kits-button.tsx` — `ActivateKitsButton`: calls
  `activateKitsAction` for one or more kit slugs, merges each retry's result
  into a running per-kit outcome list (keyed by slug so a retry replaces
  its kit's prior entry instead of duplicating it), and toasts success/
  failure via `sonner`.
- `activate-kits-button.test.tsx` — unit tests for the merge/retry logic
  above.
- `kit-card-cta.tsx` — `KitCardCta({ kit, provisionable })`: the action on an unadded kit's
  discovery card, chosen by `kitCardAction`: one-click add, "Join the waitlist"
  (`/waitlist?kit=<slug>`, in-build kits) or the kit's own login.
- `kit-discovery-card.tsx` — `KitDiscoveryCard({ kit, cta })`: the one
  discovery-bucket card used across all three of `/dashboard`'s "Explore
  more kits" subsections (Ready to add / Coming soon / Planned). `cta` is
  omitted entirely for planned kits (no real action exists for them yet).
- `kit-previews/` — `KIT_PREVIEWS`: a slug-keyed map of small, real (not
  faked) per-kit preview components (`qkit-preview.tsx`, `loopkit-preview.tsx`)
  each wrapped in `mockup-window.tsx`'s browser-chrome frame, shown on the
  discovery cards above.

## Parent

See the repo root [README.md](../../../README.md) for the full `src/` layout.

## Boundary and coverage

Activation and waitlist buttons prevent overlapping submissions and recover their pending state when an action rejects.

The local TrendIndicator is used by the admin overview's `@merqo/ui` `StatCard` (via `valueTrailing`) and the admin ProductTile. It preserves signed percentages, explicit flat state, and null suppression; the shared DeltaPill has a different two-state presentation contract.

Buttons, inputs, labels, selects, switches and tooltips used here, and cn, are imported from `@merqo/ui/primitives`; there are no local copies.
