# DESIGN.md: merqo

The family site: the public landing for the Merqo kits and the operator console.

## Public pages

Public pages (landing at `/`, `/about`, `/faq`, `/waitlist`, `/legal/*`) follow the shared rules at https://github.com/merqo-io/merqo-ui/blob/main/docs/public-page-rules.md. This section never restates them; it only adds merqo's own values.

- **Radius:** `--radius` is `0.625rem` (`src/app/globals.css:30`). Surfaces use `rounded-lg`.
- **Product objects:** the "Now serving" board in the landing hero (`src/components/landing/hero.tsx:11`): the current order number, the last orders and a status pill. It is a mock, not real data. The landing's kit stacker (`src/components/landing/kit-stacker/kit-stacker.tsx`) is a demo of how kits connect; its journey plays only when the visitor presses the play button (`kit-stacker.tsx:155`), and with reduced motion it skips the animation (`kit-stacker.tsx:108`).
- **Open:**
  - `src/components/landing/hero.tsx:19`: the board is `rounded-2xl` with `shadow-sm` on page content.
  - `src/components/landing/how-it-works.tsx:24`: the step cards are `rounded-2xl`.
  - `src/components/landing/faq.tsx:24`: the FAQ rows are `rounded-xl`.
  - `src/components/landing/kit-stacker/kit-stacker.tsx:146`: the stacker panel is `rounded-2xl` with `shadow-sm`.
  - `src/components/landing/kit-stacker/block-tower.tsx:46`: the blocks are `rounded-xl` with `shadow-sm`.
  - `src/components/landing/kit-stacker/module-list.tsx:46`: the module rows are `rounded-xl` with `shadow-sm`.
  - Audited and clean: no `ElevatedCard`, no `rounded-[...]`, no hover lift, scale or glow, no `fade-rise` or `animate-` classes and no `setInterval` in `src/components/landing`, `src/app/page.tsx`, or the `about`, `faq`, `waitlist` and `legal` pages.
