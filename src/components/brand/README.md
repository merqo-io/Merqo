# Brand components

Wordmark is the single text mark used across public pages, authentication, dashboard, admin and error surfaces. It has no client state or data dependencies. Icon-response markup and the dependency-light global-error fallback keep their separate rendering requirements.

Buttons, inputs, labels, selects, switches and tooltips used here, and cn, are imported from `@merqo/ui/primitives`; there are no local copies.

Wordmark wraps the shared `Wordmark` shell from `@merqo/ui`; the letters, gold `q`, `font-extrabold` and `lowercase` classes stay local. The default size is the shell's `sm` (`text-lg`); every caller passes its own `text-*` class.
