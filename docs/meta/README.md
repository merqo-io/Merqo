# meta

Cross-cutting project-management docs for merqo hub — distinct from the
per-feature specs/plans in `docs/superpowers/`. merqo hub had **no
consolidated backlog at all** until this doc was created 2026-07-17 — every
prior gap was scattered as a "non-goal" or "out of scope" line inside
individual feature specs, with nothing tying them together.

## Contents

- [Component reuse specification](2026-10-10-component-reuse-spec.md): confirmed cleanup scope, acceptance and intentional exclusions.
- [Component reuse verification](2026-10-10-component-reuse-verification.md): finished-work review, regressions and validation evidence.
- [Fresh-eyes close-out sweep](2026-10-24-fresh-eyes-sweep.md): knip run, loading-state review, coverage and bundle findings, with fixed, deferred and owner-decision lists.
- [AI harness reference](ai-harness-reference.md): full hook, permission, git-hook and CI description moved out of AGENTS.md.
- [templateCentral adoption log](templatecentral-adoption-log.md): 6.0.4 and 7.2.2 reviews and project adoption history moved out of AGENTS.md.

- `2026-08-15-merqo-hub-task-registry.md` — refresh of the 07-17 registry
  against current code/git history: the domain-placeholder item shipped
  (PR #11) and is now Done; the admin pricing panel and real billing/
  Stripe items are re-confirmed Still Open (verified absent in
  migrations/`src/app/admin`, not just carried forward unchecked).
- `2026-07-17-merqo-hub-task-registry.md` — merqo hub's first standing
  backlog: admin pricing panel, real billing, and the unfilled domain
  placeholder in `docs/DEPLOY.md`, promoted from scattered non-goal
  mentions into tracked items. Superseded by the 08-15 refresh above —
  kept as history, not maintained further.

## Parent

[docs](../README.md)
