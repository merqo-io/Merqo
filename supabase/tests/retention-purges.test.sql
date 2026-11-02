begin;
select no_plan();

insert into auth.users (id, instance_id, aud, role, email) values
  ('00370000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'retention-a@test.local');

insert into merqo.telegram_link_tokens (token, vendor_id, kit_slug, notify_ref, expires_at) values
  ('ret-old', '00370000-0000-0000-0000-000000000001', 'qkit', 'r1', now() - interval '2 days'),
  ('ret-grace', '00370000-0000-0000-0000-000000000001', 'qkit', 'r2', now() - interval '12 hours'),
  ('ret-live', '00370000-0000-0000-0000-000000000001', 'qkit', 'r3', now() + interval '1 hour');

insert into merqo.legal_acceptances (id, vendor_email, doc_type, doc_version, doc_sha256, kit_slug, ip, accepted_at) values
  ('00370000-0000-0000-0000-0000000000a1', 'ret-old@test.local', 'terms', 'v1', 'x', 'qkit', '203.0.113.1', now() - interval '13 months'),
  ('00370000-0000-0000-0000-0000000000a2', 'ret-new@test.local', 'terms', 'v1', 'x', 'qkit', '203.0.113.2', now() - interval '11 months');

insert into merqo.support_messages (id, user_id, category, body, created_at) values
  ('00370000-0000-0000-0000-0000000000b1', '00370000-0000-0000-0000-000000000001', 'other', 'old', now() - interval '25 months'),
  ('00370000-0000-0000-0000-0000000000b2', '00370000-0000-0000-0000-000000000001', 'other', 'recent', now() - interval '23 months');

insert into merqo.feedback (id, user_id, nps, message, created_at) values
  ('00370000-0000-0000-0000-0000000000c1', '00370000-0000-0000-0000-000000000001', 5, 'old', now() - interval '25 months'),
  ('00370000-0000-0000-0000-0000000000c2', '00370000-0000-0000-0000-000000000001', 9, 'recent', now() - interval '23 months');

select is(merqo.purge_expired_telegram_link_tokens(), 1, 'one token past expiry plus grace is purged');
select results_eq($$ select token from merqo.telegram_link_tokens where token like 'ret-%' order by token $$,
  $$ values ('ret-grace'::text), ('ret-live') $$, 'tokens inside the grace window survive');

select is(merqo.purge_legal_acceptance_ips(), 1, 'one acceptance IP past 12 months is nulled');
select results_eq($$ select id, ip from merqo.legal_acceptances where vendor_email like 'ret-%' order by id $$,
  $$ values ('00370000-0000-0000-0000-0000000000a1'::uuid, null::text), ('00370000-0000-0000-0000-0000000000a2'::uuid, '203.0.113.2'::text) $$,
  'old acceptance row kept with ip nulled, recent row untouched');

select is(merqo.purge_old_support_messages(), 1, 'one support message past 24 months is deleted');
select results_eq($$ select id from merqo.support_messages where id::text like '00370000-%' $$,
  $$ values ('00370000-0000-0000-0000-0000000000b2'::uuid) $$, 'recent support message survives');

select is(merqo.purge_old_feedback(), 1, 'one feedback row past 24 months is deleted');
select results_eq($$ select id from merqo.feedback where id::text like '00370000-%' $$,
  $$ values ('00370000-0000-0000-0000-0000000000c2'::uuid) $$, 'recent feedback survives');

select ok(not has_function_privilege(role_name, signature, 'EXECUTE'), role_name || ' cannot execute ' || signature)
from (values ('anon'), ('authenticated')) roles(role_name)
cross join (values
  ('merqo.purge_expired_telegram_link_tokens()'),
  ('merqo.purge_legal_acceptance_ips()'),
  ('merqo.purge_old_support_messages()'),
  ('merqo.purge_old_feedback()')) functions(signature);

set local role authenticated;
select throws_ok($$ select merqo.purge_old_feedback() $$, '42501', null, 'authenticated purge call is denied');
reset role;

-- The scheduling block in 0037 is skipped without pg_cron, so only assert the jobs when it is installed.
select case
  when exists (select 1 from pg_extension where extname = 'pg_cron')
  then is((select count(*)::int from cron.job where jobname in (
      'merqo_purge_telegram_link_tokens', 'merqo_purge_legal_acceptance_ips',
      'merqo_purge_support_messages', 'merqo_purge_feedback')), 4, 'all four purge jobs are scheduled')
  else pass('pg_cron not installed; schedule check skipped')
end;

select * from finish();
rollback;
