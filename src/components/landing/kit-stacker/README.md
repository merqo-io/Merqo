# src/components/landing/kit-stacker

Kit relationship visualization derived from KIT_NODES and KIT_EDGES. BlockTower renders selected kits with qkit at the base and uses brand-aware foreground tokens for piloting blocks; in-build blocks retain neutral surfaces. These previews describe configured relationships, not a guarantee that an integration is deployed.

BlockTower resolves selected slugs with the existing ecosystem nodeBySlug helper; it does not duplicate the relationship lookup.

`graph-canvas.tsx` picks node classes with `nodeClasses`, and `kit-stacker.tsx` passes the journey timer and setters to `scheduleJourneyStep` as one `JourneyHandlers` object.

Buttons, inputs, labels, selects, switches and tooltips used here, and cn, are imported from `@merqo/ui/primitives`; there are no local copies.
