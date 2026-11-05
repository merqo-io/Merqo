# Team

Team-gated membership management. Server actions validate input, enforce team authorization and prevent self-removal. RemoveMember supplies the member ID and existing copy to ConfirmAdminAction; returned or thrown failures retain the dialog for retry, and pending operations block dismissal. Add-team form state remains separate. The add-team email placeholder uses the `merqo.io` domain.

Add and remove failures name the action ("Could not add that team member. Try again.") and log the raw error server-side instead of surfacing it.

The `loading.tsx` skeleton is a `role="status"` region with `aria-busy`, an `sr-only` label and a reduced-motion fallback.

Page header follows the shared admin pattern (Admin eyebrow, display title equal to the nav label, one-line description) and sets its browser title via `metadata`.
