-- Pricing v3: Starter and Counter (qkit) gain paykit and new prices, the parked
-- kits and All-Access go off sale, and founders must hold a Counter plan.
-- Existing subscriptions are left alone: their locked price and kit snapshot
-- are what the merchant bought, and a price never rises while they stay.

update merqo.plans set monthly_cents = 1490, included_kits = '{qkit,paykit}' where slug = 'starter';
update merqo.plans set monthly_cents = 1990, included_kits = '{qkit,printkit,paykit}' where slug = 'qkit';
update merqo.plans set active = false where slug in ('loopkit', 'stockkit', 'all_access');

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
       where s.founder and s.vendor_id = new.vendor_id and s.id <> new.id)
     and (select count(distinct s.vendor_id) from merqo.subscriptions s
          where s.founder and s.id <> new.id) >= 20 then
    raise exception 'founder cap of 20 reached' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke execute on function merqo.enforce_founder_cap() from public, anon, authenticated, service_role;

drop trigger subscriptions_founder_cap on merqo.subscriptions;
create trigger subscriptions_founder_cap
  before insert or update of founder, vendor_id, plan_slug on merqo.subscriptions
  for each row execute function merqo.enforce_founder_cap();
