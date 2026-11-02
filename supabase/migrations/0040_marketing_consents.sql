-- General Merqo updates opt-in captured on the public /waitlist form (PDPA
-- consent record). Separate from vendor_links because the consent is about the
-- email address, not one kit: vendor_links has a row per (email, kit), so a
-- column there would repeat the consent per kit and could disagree between rows.
--
-- A row exists only when the box was ticked. It stores the exact wording shown
-- and when it was accepted. Unticked submissions write nothing, and a later
-- unticked submission never deletes or edits an earlier opt-in; withdrawing is
-- done by unsubscribing. Retention: kept while the address is on the updates
-- list, as evidence of consent, so no scheduled purge (compare 0037).
--
-- RLS default-deny: no policy, written and read by the service client only.

create table if not exists merqo.marketing_consents (
  email       text primary key,
  wording     text not null,
  consented_at timestamptz not null default now(),
  check (email = lower(email))
);

alter table merqo.marketing_consents enable row level security;

grant select, insert on merqo.marketing_consents to service_role;
