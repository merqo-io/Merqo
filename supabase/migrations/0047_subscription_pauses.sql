-- Billing lifecycle for manual subscriptions: pauses (at most 92 days in any
-- rolling 365 days per vendor) and a downgrade scheduled for period end.
-- Grace is computed on read from current_period_end, so it has no column here.
alter table merqo.subscriptions
  add column scheduled_plan_slug text references merqo.plans(slug);

create index subscriptions_scheduled_plan_slug_idx
  on merqo.subscriptions (scheduled_plan_slug) where scheduled_plan_slug is not null;

-- ends_on is exclusive: a pause from the 1st to the 11th is ten paused days.
create table merqo.subscription_pauses (
  id              uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references merqo.subscriptions(id) on delete cascade,
  starts_on       date not null,
  ends_on         date not null,
  reason          text not null default '',
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  constraint subscription_pauses_order check (ends_on > starts_on)
);

create index subscription_pauses_subscription_id_idx on merqo.subscription_pauses (subscription_id);
create index subscription_pauses_created_by_idx on merqo.subscription_pauses (created_by);

alter table merqo.subscription_pauses enable row level security;

create policy subscription_pauses_select on merqo.subscription_pauses
  for select to authenticated
  using (merqo.is_merqo_team((select auth.uid())));

grant select on merqo.subscription_pauses to authenticated;
grant select on merqo.subscription_pauses to service_role;

-- Pauses count per vendor, not per subscription, so a plan change cannot reset
-- the allowance. The paid period grows by the paused days: the vendor does not
-- pay for time the plan was off.
create function merqo.pause_subscription(
  p_subscription_id uuid,
  p_starts_on date,
  p_ends_on date,
  p_reason text,
  p_created_by uuid default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_vendor uuid;
  v_id     uuid;
  v_sub    merqo.subscriptions;
begin
  select s.vendor_id into v_vendor
  from merqo.subscriptions s
  where s.id = p_subscription_id;
  if not found then
    raise exception 'subscription is not active' using errcode = '23514';
  end if;

  if p_ends_on <= p_starts_on then
    raise exception 'pause must end after it starts' using errcode = '23514';
  end if;
  if p_starts_on < current_date - 1 then
    raise exception 'pause cannot start in the past' using errcode = '23514';
  end if;

  perform pg_advisory_xact_lock(hashtext('merqo.pause:' || v_vendor::text));
  select s.* into v_sub
  from merqo.subscriptions s
  where s.id = p_subscription_id
  for update;
  if v_sub.status <> 'active' then
    raise exception 'subscription is not active' using errcode = '23514';
  end if;
  -- Manual subscriptions keep their plan through a 7 day grace, others end with the period.
  if v_sub.current_period_end
       + case when v_sub.source = 'admin_manual' then interval '7 days' else interval '0' end
       < now() then
    raise exception 'subscription is no longer active' using errcode = '23514';
  end if;
  if p_starts_on > v_sub.current_period_end::date then
    raise exception 'pause cannot start after the paid period ends' using errcode = '23514';
  end if;

  if exists (
    select 1
    from merqo.subscription_pauses sp
    join merqo.subscriptions s on s.id = sp.subscription_id
    where s.vendor_id = v_vendor
      and sp.starts_on < p_ends_on
      and sp.ends_on > p_starts_on
  ) then
    raise exception 'pause overlaps an existing pause' using errcode = '23514';
  end if;

  if exists (
    with p as (
      select sp.starts_on as s, sp.ends_on as e
      from merqo.subscription_pauses sp
      join merqo.subscriptions sub on sub.id = sp.subscription_id
      where sub.vendor_id = v_vendor
      union all
      select p_starts_on, p_ends_on
    ),
    w as (
      select s as w0 from p
      union
      select e - 365 from p
    )
    select 1 from w
    where (
      select coalesce(sum(greatest(0, least(p.e, w.w0 + 365) - greatest(p.s, w.w0))), 0)
      from p
    ) > 92
  ) then
    raise exception 'pause cap of 92 days in 365 reached' using errcode = '23514';
  end if;

  insert into merqo.subscription_pauses
    (subscription_id, starts_on, ends_on, reason, created_by)
  values
    (p_subscription_id, p_starts_on, p_ends_on, coalesce(btrim(p_reason), ''), p_created_by)
  returning id into v_id;

  update merqo.subscriptions
  set current_period_end = current_period_end + make_interval(days => p_ends_on - p_starts_on),
      founder_until = case
        when founder and founder_until is not null
          then founder_until + make_interval(days => p_ends_on - p_starts_on)
        else founder_until
      end,
      updated_at = now()
  where id = p_subscription_id;

  return v_id;
end;
$$;

-- Ends a pause today. One that has not started is removed; one that has
-- started stops today. Either way the period extension shrinks to match.
create function merqo.end_pause(p_pause_id uuid, p_today date default current_date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pause   merqo.subscription_pauses;
  v_vendor  uuid;
  v_new_end date;
begin
  select sp.* into v_pause from merqo.subscription_pauses sp where sp.id = p_pause_id;
  if not found then
    raise exception 'pause not found' using errcode = '23514';
  end if;
  select s.vendor_id into v_vendor from merqo.subscriptions s where s.id = v_pause.subscription_id;
  perform pg_advisory_xact_lock(hashtext('merqo.pause:' || v_vendor::text));

  select sp.* into v_pause from merqo.subscription_pauses sp where sp.id = p_pause_id for update;
  if not found or v_pause.ends_on <= p_today then
    raise exception 'pause already ended' using errcode = '23514';
  end if;

  v_new_end := greatest(p_today, v_pause.starts_on);
  if v_new_end = v_pause.starts_on then
    delete from merqo.subscription_pauses where id = p_pause_id;
  else
    update merqo.subscription_pauses set ends_on = v_new_end where id = p_pause_id;
  end if;

  update merqo.subscriptions
  set current_period_end = current_period_end - make_interval(days => v_pause.ends_on - v_new_end),
      founder_until = case
        when founder and founder_until is not null
          then founder_until - make_interval(days => v_pause.ends_on - v_new_end)
        else founder_until
      end,
      updated_at = now()
  where id = v_pause.subscription_id;
end;
$$;

-- A vendor who ever held a subscription, in any status or source, is never a
-- trial candidate: a lapsed or grace-period customer must not restart a trial.
create or replace function merqo.trial_candidates(p_limit int)
returns table (vendor_id uuid, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, l.email
  from merqo.vendor_links l
  join auth.users u on lower(u.email) = lower(l.email)
  left join merqo.trial_checks c on c.vendor_id = u.id
  where l.product_slug = 'qkit'
    and l.status = 'active'
    and not exists (select 1 from merqo.trials t where t.vendor_id = u.id)
    and not exists (select 1 from merqo.subscriptions s where s.vendor_id = u.id)
  order by c.checked_at nulls first, u.created_at
  limit greatest(p_limit, 0);
$$;

-- Same rule as trial_candidates so the admin button cannot bypass it. Returns
-- 'ineligible' without writing a row.
create or replace function merqo.start_trial(
  p_vendor_id uuid,
  p_email text,
  p_first_order_at timestamptz,
  p_paynow_uen text default null
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ends   timestamptz := p_first_order_at + interval '30 days';
  v_status text;
begin
  perform pg_advisory_xact_lock(hashtext('trial:email:' || p_email));
  if p_paynow_uen is not null then
    perform pg_advisory_xact_lock(hashtext('trial:uen:' || p_paynow_uen));
  end if;

  if exists (select 1 from merqo.subscriptions s where s.vendor_id = p_vendor_id) then
    return 'ineligible';
  end if;

  if merqo.trial_already_used(p_vendor_id, p_email, p_paynow_uen) then
    v_status := 'blocked';
  elsif v_ends <= now() then
    v_status := 'ended';
  else
    v_status := 'active';
  end if;

  insert into merqo.trials
    (vendor_id, email_normalized, paynow_uen, status, started_at, ends_at, first_order_at)
  values
    (p_vendor_id, p_email, p_paynow_uen, v_status, p_first_order_at, v_ends, p_first_order_at)
  on conflict (vendor_id) do nothing;

  return (select t.status from merqo.trials t where t.vendor_id = p_vendor_id);
end;
$$;

revoke execute on function
  merqo.pause_subscription(uuid, date, date, text, uuid),
  merqo.end_pause(uuid, date)
  from public, anon, authenticated;
grant execute on function
  merqo.pause_subscription(uuid, date, date, text, uuid),
  merqo.end_pause(uuid, date)
  to service_role;
