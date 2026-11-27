# src/components/landing/kit-stacker

Kit relationship visualization derived from KIT_NODES and KIT_EDGES. BlockTower renders selected kits with qkit at the base and uses brand-aware foreground tokens for piloting blocks; in-build blocks retain neutral surfaces. These previews describe configured relationships, not a guarantee that an integration is deployed.

BlockTower resolves selected slugs with the existing ecosystem nodeBySlug helper; it does not duplicate the relationship lookup.

`graph-canvas.tsx` picks node classes with `nodeClasses`, and `kit-stacker.tsx` passes the journey timer and setters to `scheduleJourneyStep` as one `JourneyHandlers` object.

Buttons, inputs, labels, selects, switches and tooltips used here, and cn, are imported from `@merqo/ui/primitives`; there are no local copies.

Touch and keyboard: the highlight that hover used to drive is wired by `highlight-handlers.ts`. A mouse highlights on hover; a touch or pen tap pins the highlight, a second tap on the same item clears it, and a tap outside any kit item clears it too. Keyboard focus on a module row or tower block highlights it. Everything uses pointer events, so the compatibility mouse events after a touch cannot undo a tap, and the add/remove toggle stops its own pointerdown so tapping it changes the stack without changing the highlight. The toggle has a 44px hit area around a 28px glyph. Surfaces use `rounded-lg` with no shadow, and text a vendor reads is at least `text-xs`.

The graph is a labelled picture (`role="img"`) that mirrors the module list and block tower, which carry the same information and the same highlight, so graph nodes respond to tap and hover but are not separate tab stops. It is shown from the `lg` breakpoint and never renders narrower than its 520 unit viewBox (it scrolls inside its own container), so its text stays at least 12px.

`module-list.tsx` leads each row with the kit's `outcome` label (for example "Get paid") and shows the kit name as secondary mono text. The graph has five nodes including printkit, linked to qkit by an "orders" edge. The tower footer says each kit runs on its own.
