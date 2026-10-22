-- Staging-only kit registry wiring. Run in the STAGING project's SQL Editor
-- after each kit's schema is loaded (docs/STAGING.md). Safe to re-run.
-- Replace every __PLACEHOLDER__ with that kit's staging-only secret, never the
-- production one. A kit not on staging yet: delete its line from the list.

do $$
begin
  if exists (
    select 1 from merqo.products
    where app_url ~ '^https://(www|qkit|loopkit|paykit|stockkit|printkit)\.merqo\.io'
  ) then
    raise exception 'merqo.products points at production hosts: this is not the staging project';
  end if;
end $$;

create temporary table staging_kits (slug text, metrics_secret text, provision_secret text);

insert into staging_kits values
  ('qkit',     '__QKIT_METRICS_SECRET__',     '__QKIT_PROVISION_SECRET__'),
  ('loopkit',  '__LOOPKIT_METRICS_SECRET__',  '__LOOPKIT_PROVISION_SECRET__'),
  ('paykit',   '__PAYKIT_METRICS_SECRET__',   '__PAYKIT_PROVISION_SECRET__'),
  ('stockkit', '__STOCKKIT_METRICS_SECRET__', '__STOCKKIT_PROVISION_SECRET__');

do $$
begin
  if exists (
    select 1 from staging_kits
    where metrics_secret like '\_\_%' or provision_secret like '\_\_%'
  ) then
    raise exception 'replace every __PLACEHOLDER__ first';
  end if;
end $$;

update merqo.products p
set app_url          = 'https://' || p.slug || '-staging.merqo.io',
    metrics_url      = 'https://' || p.slug || '-staging.merqo.io/api/merqo/metrics',
    metrics_secret   = k.metrics_secret,
    provision_secret = k.provision_secret
from staging_kits k
where p.slug = k.slug;

-- Kits without a staging deployment: no URL, so staging merqo never calls production.
update merqo.products
set app_url = null, metrics_url = null, metrics_secret = null, provision_secret = null
where slug not in (select slug from staging_kits);

drop table staging_kits;

insert into merqo.merqo_team (user_id)
values ('__ADMIN_USER_ID__')
on conflict (user_id) do nothing;
