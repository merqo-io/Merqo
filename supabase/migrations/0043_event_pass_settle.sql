-- Offline settle record for an Event Pass. Merqo charges nobody; the team
-- collects the top-up outside the app and records the usage-based figures
-- here so the numbers are fixed at settle time, not recomputed later.
alter table merqo.event_passes
  add column settled_cups  integer check (settled_cups >= 0),
  add column settled_cents integer check (settled_cents >= 0),
  add column settled_at    timestamptz,
  add column settled_by    uuid references auth.users(id) on delete set null;

alter table merqo.event_passes drop constraint event_passes_status_check;
alter table merqo.event_passes
  add constraint event_passes_status_check
  check (status in ('active', 'cancelled', 'settled'));

-- A settled pass always carries its figures, and only a settled pass does.
alter table merqo.event_passes
  add constraint event_passes_settled_fields check (
    (status = 'settled'
      and settled_at is not null
      and settled_cups is not null
      and settled_cents is not null)
    or (status <> 'settled'
      and settled_at is null
      and settled_cups is null
      and settled_cents is null)
  );

create index event_passes_settled_by_idx on merqo.event_passes (settled_by);
