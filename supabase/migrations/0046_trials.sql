-- Free trial: 30 days of Pro from a vendor's first qkit order. Blocked rows are
-- kept on purpose: they are the record that a trial was already used, so
-- email_normalized and paynow_uen are indexed but not unique. Erasing an account
-- nulls vendor_id and keeps the row so the abuse check still matches.
create table merqo.trials (
  id               uuid primary key default gen_random_uuid(),
  vendor_id        uuid unique references auth.users(id) on delete set null,
  email_normalized text not null,
  paynow_uen       text,
  status           text not null check (status in ('active', 'blocked', 'overridden', 'ended')),
  started_at       timestamptz not null,
  ends_at          timestamptz not null,
  first_order_at   timestamptz,
  override_by      uuid references auth.users(id) on delete set null,
  override_reason  text,
  created_at       timestamptz not null default now()
);

create index trials_email_normalized_idx on merqo.trials (email_normalized);
create index trials_paynow_uen_idx on merqo.trials (paynow_uen) where paynow_uen is not null;

-- Lets the daily sweep rotate through vendors with no first order yet instead of
-- re-checking the same ones every run.
create table merqo.trial_checks (
  vendor_id  uuid primary key references auth.users(id) on delete cascade,
  checked_at timestamptz not null default now()
);

alter table merqo.trials       enable row level security;
alter table merqo.trial_checks enable row level security;

create policy trials_select on merqo.trials
  for select to authenticated
  using (merqo.is_merqo_team((select auth.uid())));

grant select on merqo.trials to authenticated;
grant select, insert, update on merqo.trials to service_role;
grant select, insert, update on merqo.trial_checks to service_role;

-- A trial counts as used once it ran or was overridden; a blocked row never did.
create function merqo.trial_already_used(p_vendor_id uuid, p_email text, p_uen text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from merqo.trials t
    where t.vendor_id is distinct from p_vendor_id
      and t.status <> 'blocked'
      and (t.email_normalized = p_email
           or (p_uen is not null and t.paynow_uen = p_uen))
  );
$$;

create function merqo.start_trial(
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

-- Records the vendor's PayNow/UEN and blocks a running trial if another
-- account already used it. Null when the vendor has no trial row.
create function merqo.set_trial_uen(p_vendor_id uuid, p_uen text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row   merqo.trials;
  v_email text;
begin
  select t.email_normalized into v_email
  from merqo.trials t where t.vendor_id = p_vendor_id;
  if v_email is null then
    return null;
  end if;

  perform pg_advisory_xact_lock(hashtext('trial:email:' || v_email));
  perform pg_advisory_xact_lock(hashtext('trial:uen:' || p_uen));

  update merqo.trials set paynow_uen = p_uen
  where vendor_id = p_vendor_id
  returning * into v_row;
  if not found then
    return null;
  end if;

  if v_row.status = 'active'
     and merqo.trial_already_used(p_vendor_id, v_row.email_normalized, p_uen) then
    update merqo.trials set status = 'blocked' where id = v_row.id;
    return 'blocked';
  end if;
  return v_row.status;
end;
$$;

-- Admin override: starts a fresh 30 days now for a blocked, ended or missing
-- trial. A trial that is already running is left alone.
create function merqo.override_trial(
  p_vendor_id uuid,
  p_email text,
  p_admin uuid,
  p_reason text,
  p_paynow_uen text default null
) returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'override reason is required' using errcode = '22023';
  end if;

  insert into merqo.trials
    (vendor_id, email_normalized, paynow_uen, status, started_at, ends_at,
     override_by, override_reason)
  values
    (p_vendor_id, p_email, p_paynow_uen, 'overridden', now(),
     now() + interval '30 days', p_admin, btrim(p_reason))
  on conflict (vendor_id) do update
    set status = 'overridden',
        started_at = now(),
        ends_at = now() + interval '30 days',
        paynow_uen = coalesce(excluded.paynow_uen, merqo.trials.paynow_uen),
        override_by = p_admin,
        override_reason = btrim(p_reason)
    where merqo.trials.status in ('blocked', 'ended')
       or merqo.trials.ends_at <= now();

  return (select t.status from merqo.trials t where t.vendor_id = p_vendor_id);
end;
$$;

create function merqo.trial_entitled(p_vendor_id uuid, p_at timestamptz default now())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from merqo.trials t
    where t.vendor_id = p_vendor_id
      and t.status in ('active', 'overridden')
      and t.ends_at > p_at
  );
$$;

-- Vendors with qkit access and no trial row or running paid plan, least
-- recently checked first.
create function merqo.trial_candidates(p_limit int)
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
    and not exists (
      select 1 from merqo.subscriptions s
      where s.vendor_id = u.id and s.status = 'active' and s.current_period_end > now()
    )
  order by c.checked_at nulls first, u.created_at
  limit greatest(p_limit, 0);
$$;

revoke execute on function
  merqo.trial_already_used(uuid, text, text),
  merqo.start_trial(uuid, text, timestamptz, text),
  merqo.set_trial_uen(uuid, text),
  merqo.override_trial(uuid, text, uuid, text, text),
  merqo.trial_entitled(uuid, timestamptz),
  merqo.trial_candidates(int)
  from public, anon, authenticated;
grant execute on function
  merqo.trial_already_used(uuid, text, text),
  merqo.start_trial(uuid, text, timestamptz, text),
  merqo.set_trial_uen(uuid, text),
  merqo.override_trial(uuid, text, uuid, text, text),
  merqo.trial_entitled(uuid, timestamptz),
  merqo.trial_candidates(int)
  to service_role;
