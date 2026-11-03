-- General Merqo updates opt-in captured on the public /waitlist form (PDPA
-- consent record). Separate from vendor_links because the consent is about the
-- email address, not one kit: vendor_links has a row per (email, kit), so a
-- column there would repeat the consent per kit and could disagree between rows.
--
-- A row exists only when the box was ticked. It stores the exact wording shown
-- and when it was accepted. Unticked submissions write nothing and never alter
-- an existing row. Ticking again refreshes wording and consented_at and clears
-- withdrawn_at (re-consent).
--
-- Withdrawal: there is no unsubscribe flow yet. An operator records it with
--   update merqo.marketing_consents
--   set withdrawn_at = now()
--   where email = lower('<address>') and withdrawn_at is null;
-- The row is kept as evidence; anyone sending updates must skip rows where
-- withdrawn_at is not null. Retention: rows are kept as consent evidence and
-- no scheduled purge exists (compare 0037); the owner must set a period.
--
-- RLS default-deny: no policy, written and read by the service client only.

create table if not exists merqo.marketing_consents (
  email        text primary key,
  wording      text not null,
  consented_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  check (email = lower(email))
);

alter table merqo.marketing_consents enable row level security;

revoke all on merqo.marketing_consents from anon, authenticated;
grant select, insert, update on merqo.marketing_consents to service_role;
