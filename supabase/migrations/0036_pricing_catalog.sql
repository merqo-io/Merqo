-- Plan catalog, subscriptions and billing credits. Merqo is the single source
-- of plan prices; nothing here charges anyone. Annual price is 10 x monthly
-- and is derived in code, never stored.

-- The bundle-discount toggle was the only thing in this singleton, and the
-- approved pricing has no per-count or combination discounts.
drop table merqo.billing_settings;

create table merqo.plans (
  slug            text primary key,
  kind            text not null check (kind in ('free', 'kit', 'starter', 'bundle', 'event_pass')),
  monthly_cents   integer not null check (monthly_cents >= 0),
  included_kits   text[] not null default '{}',
  active          boolean not null default true,
  per_cup_cents   integer check (per_cup_cents > 0),
  min_cents       integer check (min_cents > 0),
  cap_cents       integer check (cap_cents > 0),
  duration_days   integer check (duration_days > 0),
  created_at      timestamptz not null default now(),
  -- Event pass terms exist together on event_pass rows and nowhere else.
  constraint plans_event_pass_terms check (
    (kind = 'event_pass'
      and per_cup_cents is not null and min_cents is not null
      and cap_cents is not null and duration_days is not null
      and cap_cents >= min_cents)
    or (kind <> 'event_pass'
      and per_cup_cents is null and min_cents is null
      and cap_cents is null and duration_days is null)
  )
);

insert into merqo.plans (slug, kind, monthly_cents, included_kits, active) values
  ('free',       'free',    0,    '{qkit}',                                  true),
  ('paykit',     'kit',     800,  '{paykit}',                                false),
  ('loopkit',    'kit',     1000, '{loopkit}',                               true),
  ('starter',    'starter', 1200, '{qkit}',                                  true),
  ('stockkit',   'kit',     1500, '{stockkit}',                              true),
  ('qkit',       'kit',     1600, '{qkit,printkit}',                         true),
  ('all_access', 'bundle',  3600, '{qkit,printkit,loopkit,paykit,stockkit}', true);

insert into merqo.plans (slug, kind, monthly_cents, included_kits, active,
                         per_cup_cents, min_cents, cap_cents, duration_days)
values ('event_pass', 'event_pass', 0, '{qkit,printkit,paykit}', true, 15, 1400, 2800, 2);

-- A subscription is per vendor and plan. Founder is a flag here, not a plan:
-- a founder pays the ladder plan they chose, so no price row exists for it.
create table merqo.subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  vendor_id            uuid not null references auth.users(id) on delete cascade,
  plan_slug            text not null references merqo.plans(slug),
  interval             text not null check (interval in ('month', 'year')),
  status               text not null default 'active' check (status in ('active', 'canceled', 'expired')),
  current_period_start timestamptz not null,
  current_period_end   timestamptz not null,
  -- The vendor's own renewal date; kits added mid-term co-terminate to it.
  renewal_anchor       timestamptz not null,
  -- Price and kits as sold: later catalog changes never touch this row.
  locked_price_cents   integer not null check (locked_price_cents >= 0),
  included_kits        text[] not null default '{}',
  source               text not null default 'admin_manual' check (source in ('admin_manual', 'stripe')),
  -- founder stays true for good (the badge); founder_until ends the benefits.
  founder              boolean not null default false,
  founder_until        timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint subscriptions_period_order check (current_period_end > current_period_start),
  constraint subscriptions_founder_until check (not founder or founder_until is not null)
);

create unique index subscriptions_one_active_per_plan_idx
  on merqo.subscriptions (vendor_id, plan_slug) where status = 'active';
create index subscriptions_vendor_id_idx on merqo.subscriptions (vendor_id);
create index subscriptions_plan_slug_idx on merqo.subscriptions (plan_slug);

create table merqo.billing_credits (
  id                     uuid primary key default gen_random_uuid(),
  vendor_id              uuid not null references auth.users(id) on delete cascade,
  amount_cents           integer not null check (amount_cents > 0),
  reason                 text not null,
  source_subscription_id uuid references merqo.subscriptions(id) on delete set null,
  consumed_at            timestamptz,
  created_at             timestamptz not null default now()
);

create index billing_credits_vendor_id_idx on merqo.billing_credits (vendor_id);
create index billing_credits_source_subscription_id_idx on merqo.billing_credits (source_subscription_id);

-- Only the first 20 merchants can be founders. The advisory lock serialises
-- concurrent claims so two transactions cannot both see 19 and both insert.
create function merqo.enforce_founder_cap() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not new.founder then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtext('merqo.founder_cap'));
  if not exists (
       select 1 from merqo.subscriptions s
       where s.founder and s.vendor_id = new.vendor_id and s.id <> new.id)
     and (select count(distinct s.vendor_id) from merqo.subscriptions s
          where s.founder and s.id <> new.id) >= 20 then
    raise exception 'founder cap of 20 reached' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke execute on function merqo.enforce_founder_cap() from public, anon, authenticated, service_role;

create trigger subscriptions_founder_cap
  before insert or update of founder, vendor_id on merqo.subscriptions
  for each row execute function merqo.enforce_founder_cap();

alter table merqo.plans           enable row level security;
alter table merqo.subscriptions   enable row level security;
alter table merqo.billing_credits enable row level security;

-- Active plans are public (pricing pages); the team also sees inactive ones.
create policy plans_select on merqo.plans
  for select to anon, authenticated
  using (active or merqo.is_merqo_team((select auth.uid())));

create policy subscriptions_select on merqo.subscriptions
  for select to authenticated
  using (vendor_id = (select auth.uid()) or merqo.is_merqo_team((select auth.uid())));

create policy billing_credits_select on merqo.billing_credits
  for select to authenticated
  using (vendor_id = (select auth.uid()) or merqo.is_merqo_team((select auth.uid())));

-- Writes go through the service role (admin actions) only. No deletes: the
-- ledger tables are append-and-update.
grant select on merqo.plans to anon, authenticated;
grant select on merqo.subscriptions, merqo.billing_credits to authenticated;
grant select, insert, update on merqo.plans, merqo.subscriptions, merqo.billing_credits to service_role;
