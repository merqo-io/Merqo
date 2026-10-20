-- Staging-only kit registry wiring. Run once in the STAGING project's SQL Editor,
-- after scripts/staging-migrate.sh has bootstrapped the schema (docs/STAGING.md).
-- Replace every __PLACEHOLDER__ first. The secrets are the staging-only values,
-- never the production ones.

do $$
begin
  if exists (
    select 1 from merqo.products
    where app_url ~ '^https://(www|qkit|loopkit|paykit|stockkit|printkit)\.merqo\.io'
  ) then
    raise exception 'merqo.products points at production hosts: this is not the staging project';
  end if;
end $$;

update merqo.products
set app_url          = '__QKIT_STAGING_URL__',
    metrics_url      = '__QKIT_STAGING_URL__/api/merqo/metrics',
    metrics_secret   = '__STAGING_MERQO_METRICS_SECRET__',
    provision_secret = '__STAGING_MERQO_PROVISION_SECRET__'
where slug = 'qkit';

-- Kits without a staging deployment yet: no URL, so staging merqo never calls production.
update merqo.products
set app_url = null, metrics_url = null, metrics_secret = null, provision_secret = null
where slug <> 'qkit';

insert into merqo.merqo_team (user_id)
values ('__ADMIN_USER_ID__')
on conflict (user_id) do nothing;
