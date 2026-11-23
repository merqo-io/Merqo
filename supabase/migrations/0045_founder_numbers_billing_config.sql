-- Founder terms: numbered badges #01 to #20, a billing open date, and a close
-- date 60 days after billing opens. A number is kept for good once assigned,
-- even after founder_until passes.

-- The number is the key and a row is never deleted: erasing the account nulls
-- vendor_id, which retires the number instead of freeing it.
create table merqo.founder_numbers (
  number      smallint primary key check (number between 1 and 20),
  vendor_id   uuid unique references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now()
);

create table merqo.billing_config (
  id               boolean primary key default true check (id),
  billing_opens_at timestamptz,
  updated_at       timestamptz not null default now()
);
insert into merqo.billing_config (id) values (true);

alter table merqo.founder_numbers enable row level security;
alter table merqo.billing_config  enable row level security;

create policy founder_numbers_select on merqo.founder_numbers
  for select to authenticated
  using (merqo.is_merqo_team((select auth.uid())));

create policy billing_config_select on merqo.billing_config
  for select to authenticated
  using (merqo.is_merqo_team((select auth.uid())));

create policy billing_config_update on merqo.billing_config
  for update to authenticated
  using (merqo.is_merqo_team((select auth.uid())))
  with check (merqo.is_merqo_team((select auth.uid())));

grant select on merqo.founder_numbers to authenticated;
grant select, update on merqo.billing_config to authenticated;
grant select, insert on merqo.founder_numbers to service_role;
grant select, update on merqo.billing_config to service_role;

-- Existing founders get numbers in the order of their earliest founder row.
insert into merqo.founder_numbers (number, vendor_id)
select (row_number() over (order by first_at, vendor_id))::smallint, vendor_id
from (
  select vendor_id, min(created_at) as first_at
  from merqo.subscriptions
  where founder
  group by vendor_id
) f;

create function merqo.founder_offer_closed() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select now() > c.billing_opens_at + interval '60 days' from merqo.billing_config c),
    false);
$$;

revoke execute on function merqo.founder_offer_closed() from public, anon, authenticated, service_role;

create or replace function merqo.enforce_founder_cap() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not new.founder then
    return new;
  end if;
  if new.plan_slug not in ('qkit', 'all_access') then
    raise exception 'founder status requires a qkit or all_access subscription' using errcode = '23514';
  end if;
  perform pg_advisory_xact_lock(hashtext('merqo.founder_cap'));
  if not exists (
       select 1 from merqo.subscriptions s
       where s.founder and s.vendor_id = new.vendor_id and s.id <> new.id) then
    if merqo.founder_offer_closed() then
      raise exception 'founder offer closed' using errcode = '23514';
    end if;
    if (select count(distinct s.vendor_id) from merqo.subscriptions s
        where s.founder and s.id <> new.id) >= 20 then
      raise exception 'founder cap of 20 reached' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create function merqo.assign_founder_number() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  free_number smallint;
begin
  if exists (select 1 from merqo.founder_numbers where vendor_id = new.vendor_id) then
    return null;
  end if;
  perform pg_advisory_xact_lock(hashtext('merqo.founder_cap'));
  select min(n)::smallint into free_number
  from generate_series(1, 20) n
  where n not in (select number from merqo.founder_numbers);
  if free_number is null then
    raise exception 'no founder number free' using errcode = '23514';
  end if;
  insert into merqo.founder_numbers (number, vendor_id) values (free_number, new.vendor_id)
  on conflict (vendor_id) do nothing;
  return null;
end;
$$;

revoke execute on function merqo.assign_founder_number() from public, anon, authenticated, service_role;

create trigger subscriptions_founder_number
  after insert or update of founder, vendor_id on merqo.subscriptions
  for each row when (new.founder) execute function merqo.assign_founder_number();

create function merqo.founder_spots_left() returns integer
language sql stable security definer set search_path = '' as $$
  select case
    when merqo.founder_offer_closed() then 0
    else greatest(0, 20 - (select count(distinct s.vendor_id)::int
                           from merqo.subscriptions s where s.founder))
  end;
$$;

revoke execute on function merqo.founder_spots_left() from public;
grant execute on function merqo.founder_spots_left() to anon, authenticated, service_role;
