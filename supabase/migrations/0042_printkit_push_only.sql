-- printkit receives merqo's entitlement pushes (its label gate reads them) but
-- is not a grantable kit: no metrics, no dashboard card, no admin grant. A
-- third status keeps it out of every status = 'live' query while still giving
-- the push path a row that carries app_url and provision_secret.
alter table merqo.products drop constraint if exists products_status_check;
alter table merqo.products
  add constraint products_status_check
  check (status in ('live', 'coming_soon', 'push_only'));

-- app_url and provision_secret are set out-of-band per database (Supabase SQL
-- editor), like every other kit's row; until then the push is recorded as
-- 'skipped'.
insert into merqo.products (slug, name, status)
values ('printkit', 'Merqo printkit — Labels', 'push_only')
on conflict (slug) do nothing;
