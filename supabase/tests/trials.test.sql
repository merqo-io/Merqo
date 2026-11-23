begin;
select no_plan();

insert into auth.users (id, instance_id, aud, role, email)
select ('46000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
       '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'trial-' || n || '@test.local'
from generate_series(1, 6) n;

select is(merqo.start_trial('46000000-0000-0000-0000-000000000001', 'a@x.test', now() - interval '2 days', null),
  'active', 'a first order two days ago starts an active trial');
select is(merqo.start_trial('46000000-0000-0000-0000-000000000001', 'a@x.test', now() - interval '1 day', null),
  'active', 'starting again is idempotent');
select is((select count(*)::int from merqo.trials where vendor_id = '46000000-0000-0000-0000-000000000001'), 1,
  'the repeat start adds no row');
select is((select first_order_at < now() - interval '1 day 12 hours' from merqo.trials where vendor_id = '46000000-0000-0000-0000-000000000001'), true,
  'the repeat start keeps the first order date');
select is((select ends_at - started_at from merqo.trials where vendor_id = '46000000-0000-0000-0000-000000000001'), interval '30 days',
  'a trial lasts 30 days');
select is(merqo.trial_entitled('46000000-0000-0000-0000-000000000001'), true, 'a running trial is entitled');

select is(merqo.start_trial('46000000-0000-0000-0000-000000000002', 'a@x.test', now(), null),
  'blocked', 'a second account with the same normalised email is blocked');
select is(merqo.trial_entitled('46000000-0000-0000-0000-000000000002'), false, 'a blocked trial has no entitlement');

update merqo.trials set paynow_uen = '201912345A' where vendor_id = '46000000-0000-0000-0000-000000000001';
select is(merqo.start_trial('46000000-0000-0000-0000-000000000003', 'c@x.test', now(), '201912345A'),
  'blocked', 'a matching PayNow/UEN is blocked');
select is(merqo.start_trial('46000000-0000-0000-0000-000000000004', 'd@x.test', now(), '999999999Z'),
  'active', 'a fresh email and UEN starts a trial');
select is(merqo.set_trial_uen('46000000-0000-0000-0000-000000000004', '201912345A'),
  'blocked', 'setting a used UEN afterwards blocks the running trial');
select is(merqo.set_trial_uen('46000000-0000-0000-0000-000000000006', 'x'), null, 'setting a UEN with no trial row does nothing');

select is(merqo.override_trial('46000000-0000-0000-0000-000000000002', 'a@x.test', '46000000-0000-0000-0000-000000000005', 'Same owner, new login', null),
  'overridden', 'an admin override starts the blocked trial');
select is(merqo.trial_entitled('46000000-0000-0000-0000-000000000002'), true, 'an overridden trial is entitled');
select is((select override_reason from merqo.trials where vendor_id = '46000000-0000-0000-0000-000000000002'), 'Same owner, new login',
  'the override keeps its reason');
select throws_ok($$ select merqo.override_trial('46000000-0000-0000-0000-000000000003', 'c@x.test', '46000000-0000-0000-0000-000000000005', '  ', null) $$,
  '22023', null, 'an override needs a reason');

select is(merqo.start_trial('46000000-0000-0000-0000-000000000005', 'e@x.test', now() - interval '40 days', null),
  'ended', 'a first order older than 30 days is already over');
select is(merqo.trial_entitled('46000000-0000-0000-0000-000000000001', now() + interval '31 days'), false,
  'an expired trial falls back to no entitlement');
select is(merqo.trial_entitled('46000000-0000-0000-0000-000000000001', now() + interval '10 days'), true,
  'the same trial is still entitled before it expires');

insert into merqo.products (slug, name, status) values ('qkit', 'qkit', 'live') on conflict do nothing;
insert into merqo.vendor_links (email, product_slug, status) values ('trial-6@test.local', 'qkit', 'active');
select is((select count(*)::int from merqo.trial_candidates(25) where email = 'trial-6@test.local'), 1,
  'a qkit vendor with no trial is a sweep candidate');
select is((select count(*)::int from merqo.trial_candidates(0)), 0, 'the sweep limit is honoured');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '46000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
select is((select count(*)::int from merqo.trials), 0, 'a vendor reads no trial rows');
select throws_ok($$ select merqo.start_trial('46000000-0000-0000-0000-000000000001', 'a@x.test', now(), null) $$,
  '42501', null, 'a vendor cannot start a trial directly');
reset role;

select * from finish();
rollback;
