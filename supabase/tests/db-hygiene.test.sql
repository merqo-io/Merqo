begin;
select no_plan();

select has_index('merqo', 'admin_audit', 'admin_audit_admin_id_idx', 'merqo.admin_audit (admin_id) is indexed');
select has_index('merqo', 'feedback', 'feedback_user_id_idx', 'merqo.feedback (user_id) is indexed');
select has_index('merqo', 'support_messages', 'support_messages_user_id_idx', 'merqo.support_messages (user_id) is indexed');
select has_index('merqo', 'telegram_link_tokens', 'telegram_link_tokens_vendor_id_idx', 'merqo.telegram_link_tokens (vendor_id) is indexed');
select has_index('merqo', 'vendor_feedback', 'vendor_feedback_vendor_id_idx', 'merqo.vendor_feedback (vendor_id) is indexed');
select has_index('merqo', 'vendor_links', 'vendor_links_product_slug_idx', 'merqo.vendor_links (product_slug) is indexed');

select is(
  (select count(*)::int from pg_tables where schemaname = 'merqo' and not rowsecurity),
  0, 'every merqo table has row level security on');

-- admin_audit: team members read it, nobody else; no client writes.
insert into auth.users (id, instance_id, aud, role, email) values
  ('a0000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'hygiene-team@test.local'),
  ('a0000000-0000-0000-0000-00000000a002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'hygiene-vendor@test.local');
insert into merqo.merqo_team (user_id) values ('a0000000-0000-0000-0000-00000000a001');
insert into merqo.admin_audit (admin_id, action) values ('a0000000-0000-0000-0000-00000000a001', 'hygiene_probe');

select ok(not has_table_privilege('anon', 'merqo.admin_audit', p), 'anon has no ' || p || ' on merqo.admin_audit')
from unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE']) p;
select ok(not has_table_privilege('authenticated', 'merqo.admin_audit', p), 'authenticated has no ' || p || ' on merqo.admin_audit')
from unnest(array['INSERT', 'UPDATE', 'DELETE']) p;

set local role anon;
select set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
select throws_ok($$ select 1 from merqo.admin_audit $$, '42501', null, 'anon cannot read merqo.admin_audit');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'a0000000-0000-0000-0000-00000000a002', 'role', 'authenticated')::text, true);
select is((select count(*)::int from merqo.admin_audit where action = 'hygiene_probe'), 0, 'a vendor reads no audit rows');
select set_config('request.jwt.claims', json_build_object('sub', 'a0000000-0000-0000-0000-00000000a001', 'role', 'authenticated')::text, true);
select is((select count(*)::int from merqo.admin_audit where action = 'hygiene_probe'), 1, 'a team member reads the audit rows');
reset role;

select * from finish();
rollback;
