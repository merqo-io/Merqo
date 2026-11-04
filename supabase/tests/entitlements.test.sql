begin;
select no_plan();

select has_table('merqo', 'event_passes', 'event_passes exists');
select has_table('merqo', 'subscription_requests', 'subscription_requests exists');
select has_table('merqo', 'entitlement_sync', 'entitlement_sync exists');
select has_index('merqo', 'event_passes', 'event_passes_vendor_id_idx', 'event_passes (vendor_id) is indexed');
select has_index('merqo', 'event_passes', 'event_passes_created_by_idx', 'event_passes (created_by) is indexed');
select has_index('merqo', 'event_passes', 'event_passes_settled_by_idx', 'event_passes (settled_by) is indexed');
select has_index('merqo', 'subscription_requests', 'subscription_requests_vendor_id_idx', 'subscription_requests (vendor_id) is indexed');
select has_index('merqo', 'subscription_requests', 'subscription_requests_plan_slug_idx', 'subscription_requests (plan_slug) is indexed');
select has_index('merqo', 'subscription_requests', 'subscription_requests_resolved_by_idx', 'subscription_requests (resolved_by) is indexed');

-- Fixtures: vendors 1 and 2, team member 3.
insert into auth.users (id, instance_id, aud, role, email)
select ('37000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
       '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'entitlements-' || n || '@test.local'
from generate_series(1, 3) n;
insert into merqo.merqo_team (user_id) values ('37000000-0000-0000-0000-000000000003');

-- event_passes CHECKs.
insert into merqo.event_passes (vendor_id, starts_at, ends_at, prepaid_cents, created_by)
values ('37000000-0000-0000-0000-000000000001', '2026-12-01', '2026-12-03', 1400, '37000000-0000-0000-0000-000000000003');
select throws_ok($$ insert into merqo.event_passes (vendor_id, starts_at, ends_at, prepaid_cents)
  values ('37000000-0000-0000-0000-000000000001', '2026-12-03', '2026-12-01', 1400) $$,
  '23514', null, 'a pass ending before it starts is rejected');
select throws_ok($$ insert into merqo.event_passes (vendor_id, starts_at, ends_at, prepaid_cents)
  values ('37000000-0000-0000-0000-000000000001', '2026-12-01', '2026-12-03', -1) $$,
  '23514', null, 'a negative prepaid amount is rejected');
select throws_ok($$ insert into merqo.event_passes (vendor_id, starts_at, ends_at, prepaid_cents, status)
  values ('37000000-0000-0000-0000-000000000001', '2026-12-01', '2026-12-03', 1400, 'paused') $$,
  '23514', null, 'an unknown pass status is rejected');
select throws_ok($$ insert into merqo.event_passes (vendor_id, starts_at, ends_at, prepaid_cents, source)
  values ('37000000-0000-0000-0000-000000000001', '2026-12-01', '2026-12-03', 1400, 'stripe') $$,
  '23514', null, 'an unknown pass source is rejected');

select throws_ok($$ insert into merqo.event_passes (vendor_id, starts_at, ends_at, prepaid_cents, status)
  values ('37000000-0000-0000-0000-000000000001', '2026-12-01', '2026-12-03', 1400, 'settled') $$,
  '23514', null, 'a settled pass without its figures is rejected');
select throws_ok($$ insert into merqo.event_passes (vendor_id, starts_at, ends_at, prepaid_cents, settled_cups, settled_cents, settled_at)
  values ('37000000-0000-0000-0000-000000000001', '2026-12-01', '2026-12-03', 1400, 10, 0, now()) $$,
  '23514', null, 'settle figures on an unsettled pass are rejected');
select lives_ok($$ insert into merqo.event_passes (vendor_id, starts_at, ends_at, prepaid_cents, status, settled_cups, settled_cents, settled_at)
  values ('37000000-0000-0000-0000-000000000001', '2026-12-01', '2026-12-03', 1400, 'settled', 120, 400, now()) $$,
  'a settled pass with its figures is accepted');
delete from merqo.event_passes where status = 'settled';

-- subscription_requests CHECKs and the one-pending-per-vendor rule.
insert into merqo.subscription_requests (vendor_id, plan_slug, kind)
values ('37000000-0000-0000-0000-000000000001', 'qkit', 'upgrade');
select throws_ok($$ insert into merqo.subscription_requests (vendor_id, plan_slug, kind)
  values ('37000000-0000-0000-0000-000000000001', 'loopkit', 'upgrade') $$,
  '23505', null, 'a second pending request for the same vendor is rejected');
select lives_ok($$ update merqo.subscription_requests set status = 'resolved', resolved_at = now(),
  resolved_by = '37000000-0000-0000-0000-000000000003' where vendor_id = '37000000-0000-0000-0000-000000000001' $$,
  'a pending request can be resolved');
select lives_ok($$ insert into merqo.subscription_requests (vendor_id, plan_slug, kind)
  values ('37000000-0000-0000-0000-000000000001', 'loopkit', 'upgrade') $$,
  'a new request is allowed once the previous one is resolved');
select throws_ok($$ insert into merqo.subscription_requests (vendor_id, plan_slug, kind)
  values ('37000000-0000-0000-0000-000000000002', 'qkit', 'refund') $$,
  '23514', null, 'an unknown request kind is rejected');
select throws_ok($$ insert into merqo.subscription_requests (vendor_id, plan_slug, kind)
  values ('37000000-0000-0000-0000-000000000002', 'missing', 'upgrade') $$,
  '23503', null, 'a request for an unknown plan is rejected');
select throws_ok($$ insert into merqo.subscription_requests (vendor_id, plan_slug, kind, interval)
  values ('37000000-0000-0000-0000-000000000002', 'qkit', 'upgrade', 'week') $$,
  '23514', null, 'an unknown request interval is rejected');

-- entitlement_sync.
insert into merqo.entitlement_sync (vendor_id, kit_slug, payload, last_status)
values ('37000000-0000-0000-0000-000000000001', 'qkit', '{"tier":"qkit"}', 'failed');
select throws_ok($$ insert into merqo.entitlement_sync (vendor_id, kit_slug, payload, last_status)
  values ('37000000-0000-0000-0000-000000000001', 'qkit', '{}', 'ok') $$,
  '23505', null, 'one sync row per vendor and kit');
select throws_ok($$ insert into merqo.entitlement_sync (vendor_id, kit_slug, payload, last_status)
  values ('37000000-0000-0000-0000-000000000001', 'loopkit', '{}', 'weird') $$,
  '23514', null, 'an unknown sync status is rejected');

select has_column('merqo', 'entitlement_sync', 'last_error_kind', 'the push log records why a push failed');
select throws_ok($$ insert into merqo.entitlement_sync (vendor_id, kit_slug, payload, last_status, last_error_kind)
  values ('37000000-0000-0000-0000-000000000001', 'paykit', '{}', 'failed', 'weird') $$,
  '23514', null, 'an unknown error kind is rejected');

-- user_id_for_email.
select is(merqo.user_id_for_email('Entitlements-2@test.local'), '37000000-0000-0000-0000-000000000002'::uuid,
  'user_id_for_email matches case-insensitively');
select is(merqo.user_id_for_email('nobody@test.local'), null, 'user_id_for_email returns null for an unknown email');
select ok(not has_function_privilege(r, 'merqo.user_id_for_email(text)', 'EXECUTE'), r || ' cannot execute user_id_for_email')
from unnest(array['anon', 'authenticated']) r;
select ok(has_function_privilege('service_role', 'merqo.user_id_for_email(text)', 'EXECUTE'), 'service_role executes user_id_for_email');

-- Grants.
select ok(not has_table_privilege('authenticated', t, p), 'authenticated has no ' || p || ' on ' || t)
from unnest(array['merqo.event_passes', 'merqo.subscription_requests', 'merqo.entitlement_sync']) t,
     unnest(array['INSERT', 'UPDATE', 'DELETE']) p;
select ok(not has_table_privilege('anon', t, 'SELECT'), 'anon has no access to ' || t)
from unnest(array['merqo.event_passes', 'merqo.subscription_requests', 'merqo.entitlement_sync']) t;
select ok(has_table_privilege('service_role', t, 'INSERT'), 'service role writes ' || t)
from unnest(array['merqo.event_passes', 'merqo.subscription_requests', 'merqo.entitlement_sync']) t;

-- RLS: vendors read their own passes and requests, never the push log.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '37000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
select is((select count(*)::int from merqo.event_passes), 1, 'a vendor reads their own pass');
select cmp_ok((select count(*)::int from merqo.subscription_requests), '>', 0, 'a vendor reads their own requests');
select is((select count(*)::int from merqo.entitlement_sync), 0, 'a vendor reads no push log rows');
select throws_ok($$ insert into merqo.subscription_requests (vendor_id, plan_slug, kind)
  values ('37000000-0000-0000-0000-000000000001', 'qkit', 'cancel') $$,
  '42501', null, 'a vendor cannot write requests directly');
select set_config('request.jwt.claims', json_build_object('sub', '37000000-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
select is((select count(*)::int from merqo.event_passes), 0, 'another vendor reads no passes');
select is((select count(*)::int from merqo.subscription_requests), 0, 'another vendor reads no requests');
select set_config('request.jwt.claims', json_build_object('sub', '37000000-0000-0000-0000-000000000003', 'role', 'authenticated')::text, true);
select is((select count(*)::int from merqo.event_passes), 1, 'the team reads every pass');
select is((select count(*)::int from merqo.entitlement_sync), 1, 'the team reads the push log');
reset role;

select * from finish();
rollback;
