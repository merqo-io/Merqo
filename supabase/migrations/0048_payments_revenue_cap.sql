-- Manual PayNow payments the team records by hand, and an optional revenue cap
-- the team types in. The cap and its window start stay null until set.
create table merqo.payments (
  id              uuid primary key default gen_random_uuid(),
  vendor_id       uuid references auth.users(id) on delete set null,
  subscription_id uuid references merqo.subscriptions(id) on delete set null,
  amount_cents    integer not null check (amount_cents > 0),
  received_on     date not null,
  method          text not null default 'paynow' check (method in ('paynow', 'bank_transfer', 'other')),
  reference       text,
  note            text,
  recorded_by     uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index payments_vendor_id_idx on merqo.payments (vendor_id);
create index payments_subscription_id_idx on merqo.payments (subscription_id);
create index payments_recorded_by_idx on merqo.payments (recorded_by);
create index payments_received_on_idx on merqo.payments (received_on desc);

alter table merqo.payments enable row level security;

create policy payments_select on merqo.payments
  for select to authenticated
  using (merqo.is_merqo_team((select auth.uid())));

grant select on merqo.payments to authenticated;
grant select, insert, delete on merqo.payments to service_role;

alter table merqo.billing_config
  add column revenue_cap_cents bigint check (revenue_cap_cents > 0),
  add column revenue_window_start date;

create function merqo.revenue_total(p_from date) returns bigint
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(amount_cents), 0)::bigint
  from merqo.payments
  where received_on >= p_from;
$$;

revoke execute on function merqo.revenue_total(date) from public, anon, authenticated;
grant execute on function merqo.revenue_total(date) to service_role;

create function merqo.recent_payments(p_limit integer)
returns table (
  id uuid,
  vendor_email text,
  amount_cents integer,
  received_on date,
  method text,
  reference text,
  note text
)
language sql stable security definer set search_path = '' as $$
  select p.id, u.email::text, p.amount_cents, p.received_on, p.method, p.reference, p.note
  from merqo.payments p
  left join auth.users u on u.id = p.vendor_id
  order by p.received_on desc, p.created_at desc
  limit greatest(p_limit, 0);
$$;

revoke execute on function merqo.recent_payments(integer) from public, anon, authenticated;
grant execute on function merqo.recent_payments(integer) to service_role;
