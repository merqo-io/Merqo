-- Merqo-side entitlements: event passes, vendor subscription requests and the
-- per-kit push log. Nothing here charges anyone; admins collect payment by hand.

-- A pass is its own table, not a subscription: it is a two-day window, and
-- metering and settlement fields land here later.
create table merqo.event_passes (
  id            uuid primary key default gen_random_uuid(),
  vendor_id     uuid not null references auth.users(id) on delete cascade,
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  prepaid_cents integer not null check (prepaid_cents >= 0),
  source        text not null default 'admin_manual' check (source in ('admin_manual')),
  created_by    uuid references auth.users(id) on delete set null,
  status        text not null default 'active' check (status in ('active', 'cancelled')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint event_passes_window_order check (ends_at > starts_at)
);

create index event_passes_vendor_id_idx on merqo.event_passes (vendor_id);
create index event_passes_created_by_idx on merqo.event_passes (created_by);

-- A vendor asks; the team resolves it in the admin queue.
create table merqo.subscription_requests (
  id          uuid primary key default gen_random_uuid(),
  vendor_id   uuid not null references auth.users(id) on delete cascade,
  plan_slug   text not null references merqo.plans(slug),
  interval    text not null default 'month' check (interval in ('month', 'year')),
  kind        text not null check (kind in ('upgrade', 'downgrade', 'cancel')),
  status      text not null default 'pending' check (status in ('pending', 'resolved', 'declined')),
  note        text,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null
);

create index subscription_requests_vendor_id_idx on merqo.subscription_requests (vendor_id);
create index subscription_requests_plan_slug_idx on merqo.subscription_requests (plan_slug);
create index subscription_requests_resolved_by_idx on merqo.subscription_requests (resolved_by);

-- One open request per vendor: a second click while pending is a no-op.
create unique index subscription_requests_one_pending_idx
  on merqo.subscription_requests (vendor_id) where status = 'pending';

-- Last push of a vendor's entitlement to one kit, so the admin can see which
-- kits are behind and re-push. kit_slug has no FK: kits come and go in the registry.
create table merqo.entitlement_sync (
  vendor_id       uuid not null references auth.users(id) on delete cascade,
  kit_slug        text not null,
  payload         jsonb not null,
  last_status     text not null check (last_status in ('ok', 'failed', 'skipped')),
  last_http_status integer,
  last_attempt_at timestamptz not null default now(),
  last_success_at timestamptz,
  primary key (vendor_id, kit_slug)
);

-- Kits are keyed by email, merqo by auth id; admin pages start from an email.
create function merqo.user_id_for_email(p_email text) returns uuid
language sql stable security definer set search_path = '' as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;

revoke execute on function merqo.user_id_for_email(text) from public, anon, authenticated;
grant execute on function merqo.user_id_for_email(text) to service_role;

alter table merqo.event_passes          enable row level security;
alter table merqo.subscription_requests enable row level security;
alter table merqo.entitlement_sync      enable row level security;

create policy event_passes_select on merqo.event_passes
  for select to authenticated
  using (vendor_id = (select auth.uid()) or merqo.is_merqo_team((select auth.uid())));

create policy subscription_requests_select on merqo.subscription_requests
  for select to authenticated
  using (vendor_id = (select auth.uid()) or merqo.is_merqo_team((select auth.uid())));

-- Push payloads carry the vendor's email-keyed entitlement: team eyes only.
create policy entitlement_sync_select on merqo.entitlement_sync
  for select to authenticated
  using (merqo.is_merqo_team((select auth.uid())));

-- Writes go through the service role (admin and vendor actions) only.
grant select on merqo.event_passes, merqo.subscription_requests, merqo.entitlement_sync to authenticated;
grant select, insert, update on merqo.event_passes, merqo.subscription_requests, merqo.entitlement_sync to service_role;
