-- Scheduled retention purges (CCSP finding H8): merqo kept these rows forever.
--
-- Retention periods. Neither the privacy notice nor docs/security state a
-- period for these tables (docs/security/2026-10-24-data-inventory.md marks
-- each "retention period to set in X-26"), so these are conservative
-- defaults that the owner must confirm and the privacy copy must then state:
--   telegram_link_tokens  deleted 1 day after expires_at (single-use tokens
--                         are already deleted on use; this clears abandoned ones)
--   legal_acceptances.ip  nulled 12 months after accepted_at; the row stays
--                         as evidence of what was accepted and when
--   support_messages      deleted 24 months after created_at
--   feedback              deleted 24 months after created_at
--
-- Safe to re-run: functions are create-or-replace and each job is
-- unscheduled before being scheduled again. Purge logic lives in SECURITY
-- DEFINER functions that only pg_cron (running as the owner) may call.

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
  end if;
end;
$$;

create or replace function merqo.purge_expired_telegram_link_tokens()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from merqo.telegram_link_tokens
  where expires_at < now() - interval '1 day';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function merqo.purge_legal_acceptance_ips()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update merqo.legal_acceptances
  set ip = null
  where ip is not null
    and accepted_at < now() - interval '12 months';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function merqo.purge_old_support_messages()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from merqo.support_messages
  where created_at < now() - interval '24 months';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function merqo.purge_old_feedback()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from merqo.feedback
  where created_at < now() - interval '24 months';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function merqo.purge_expired_telegram_link_tokens() from public, anon, authenticated, service_role;
revoke all on function merqo.purge_legal_acceptance_ips() from public, anon, authenticated, service_role;
revoke all on function merqo.purge_old_support_messages() from public, anon, authenticated, service_role;
revoke all on function merqo.purge_old_feedback() from public, anon, authenticated, service_role;

-- Skipped where pg_cron is unavailable (e.g. a database without the
-- extension); the functions above still exist for manual runs.
do $$
declare
  v_job record;
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron not installed; retention purges not scheduled';
    return;
  end if;

  for v_job in
    select * from (values
      ('merqo_purge_telegram_link_tokens', '15 3 * * *', 'select merqo.purge_expired_telegram_link_tokens()'),
      ('merqo_purge_legal_acceptance_ips', '20 3 * * *', 'select merqo.purge_legal_acceptance_ips()'),
      ('merqo_purge_support_messages', '25 3 * * *', 'select merqo.purge_old_support_messages()'),
      ('merqo_purge_feedback', '30 3 * * *', 'select merqo.purge_old_feedback()')
    ) as j(name, schedule, command)
  loop
    if exists (select 1 from cron.job where jobname = v_job.name) then
      perform cron.unschedule(v_job.name);
    end if;
    perform cron.schedule(v_job.name, v_job.schedule, v_job.command);
  end loop;
end;
$$;
