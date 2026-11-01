begin;
select no_plan();

-- Seeded catalog (0036): monthly cents, kind and active flag per plan.
select results_eq(
  $$ select slug, kind, monthly_cents, active from merqo.plans where kind <> 'event_pass' order by monthly_cents, slug $$,
  $$ values
    ('free'::text, 'free'::text, 0, true),
    ('paykit', 'kit', 800, false),
    ('loopkit', 'kit', 1000, true),
    ('starter', 'starter', 1200, true),
    ('stockkit', 'kit', 1500, true),
    ('qkit', 'kit', 1600, true),
    ('all_access', 'bundle', 3600, true) $$,
  'ladder and bundle are seeded with the approved prices');
select results_eq(
  $$ select per_cup_cents, min_cents, cap_cents, duration_days from merqo.plans where slug = 'event_pass' $$,
  $$ values (15, 1400, 2800, 2) $$,
  'event pass terms are seeded');
select is(
  (select included_kits from merqo.plans where slug = 'all_access'),
  array['qkit', 'printkit', 'loopkit', 'paykit', 'stockkit'],
  'all_access includes every current kit');
select hasnt_table('merqo', 'billing_settings', 'billing_settings is dropped');

-- Plan CHECKs.
select throws_ok($$ insert into merqo.plans (slug, kind, monthly_cents) values ('bad1', 'nope', 1) $$,
  '23514', null, 'unknown plan kind is rejected');
select throws_ok($$ insert into merqo.plans (slug, kind, monthly_cents) values ('bad2', 'kit', -1) $$,
  '23514', null, 'negative price is rejected');
select throws_ok($$ insert into merqo.plans (slug, kind, monthly_cents, per_cup_cents) values ('bad3', 'kit', 1, 15) $$,
  '23514', null, 'event pass terms on a non-event plan are rejected');
select throws_ok($$ insert into merqo.plans (slug, kind, monthly_cents) values ('bad4', 'event_pass', 0) $$,
  '23514', null, 'event pass without terms is rejected');
select throws_ok($$ insert into merqo.plans (slug, kind, monthly_cents, per_cup_cents, min_cents, cap_cents, duration_days)
  values ('bad5', 'event_pass', 0, 15, 2800, 1400, 2) $$,
  '23514', null, 'event pass cap below minimum is rejected');

-- Fixtures: 22 vendors (1..22) and one team member (23).
insert into auth.users (id, instance_id, aud, role, email)
select ('36000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
       '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pricing-' || n || '@test.local'
from generate_series(1, 23) n;
insert into merqo.merqo_team (user_id) values ('36000000-0000-0000-0000-000000000023');

-- Subscription CHECKs and uniqueness.
insert into merqo.subscriptions (vendor_id, plan_slug, interval, current_period_start, current_period_end, renewal_anchor, locked_price_cents, included_kits)
values ('36000000-0000-0000-0000-000000000001', 'qkit', 'year', '2026-01-01', '2027-01-01', '2027-01-01', 16000, '{qkit,printkit}');
select throws_ok($$ insert into merqo.subscriptions (vendor_id, plan_slug, interval, current_period_start, current_period_end, renewal_anchor, locked_price_cents)
  values ('36000000-0000-0000-0000-000000000001', 'qkit', 'year', '2026-02-01', '2027-02-01', '2027-02-01', 16000) $$,
  '23505', null, 'a second active subscription to the same plan is rejected');
select lives_ok($$ insert into merqo.subscriptions (vendor_id, plan_slug, interval, status, current_period_start, current_period_end, renewal_anchor, locked_price_cents)
  values ('36000000-0000-0000-0000-000000000001', 'qkit', 'year', 'canceled', '2025-01-01', '2026-01-01', '2026-01-01', 16000) $$,
  'a canceled subscription to the same plan is allowed');
select throws_ok($$ insert into merqo.subscriptions (vendor_id, plan_slug, interval, current_period_start, current_period_end, renewal_anchor, locked_price_cents)
  values ('36000000-0000-0000-0000-000000000002', 'qkit', 'week', '2026-01-01', '2027-01-01', '2027-01-01', 1) $$,
  '23514', null, 'unknown interval is rejected');
select throws_ok($$ insert into merqo.subscriptions (vendor_id, plan_slug, interval, current_period_start, current_period_end, renewal_anchor, locked_price_cents)
  values ('36000000-0000-0000-0000-000000000002', 'qkit', 'month', '2026-02-01', '2026-01-01', '2026-01-01', 1) $$,
  '23514', null, 'period end before start is rejected');
select throws_ok($$ insert into merqo.subscriptions (vendor_id, plan_slug, interval, current_period_start, current_period_end, renewal_anchor, locked_price_cents, source)
  values ('36000000-0000-0000-0000-000000000002', 'qkit', 'month', '2026-01-01', '2026-02-01', '2026-02-01', 1, 'paypal') $$,
  '23514', null, 'unknown source is rejected');
select throws_ok($$ insert into merqo.subscriptions (vendor_id, plan_slug, interval, current_period_start, current_period_end, renewal_anchor, locked_price_cents, founder)
  values ('36000000-0000-0000-0000-000000000002', 'qkit', 'month', '2026-01-01', '2026-02-01', '2026-02-01', 1, true) $$,
  '23514', null, 'a founder without founder_until is rejected');
select throws_ok($$ insert into merqo.subscriptions (vendor_id, plan_slug, interval, current_period_start, current_period_end, renewal_anchor, locked_price_cents)
  values ('36000000-0000-0000-0000-000000000002', 'missing', 'month', '2026-01-01', '2026-02-01', '2026-02-01', 1) $$,
  '23503', null, 'unknown plan is rejected');

-- Founder cap: vendors 1..20 become founders, the 21st is refused.
insert into merqo.subscriptions (vendor_id, plan_slug, interval, current_period_start, current_period_end, renewal_anchor, locked_price_cents, founder, founder_until)
select ('36000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid, 'loopkit', 'month',
       '2026-01-01', '2026-02-01', '2026-02-01', 1000, true, '2027-01-01'
from generate_series(1, 20) n;
select is((select count(distinct vendor_id)::int from merqo.subscriptions where founder), 20, 'twenty founders are allowed');
select throws_ok($$ insert into merqo.subscriptions (vendor_id, plan_slug, interval, current_period_start, current_period_end, renewal_anchor, locked_price_cents, founder, founder_until)
  values ('36000000-0000-0000-0000-000000000021', 'loopkit', 'month', '2026-01-01', '2026-02-01', '2026-02-01', 1000, true, '2027-01-01') $$,
  '23514', 'founder cap of 20 reached', 'a 21st founder is refused');
select lives_ok($$ insert into merqo.subscriptions (vendor_id, plan_slug, interval, current_period_start, current_period_end, renewal_anchor, locked_price_cents, founder, founder_until)
  values ('36000000-0000-0000-0000-000000000005', 'stockkit', 'month', '2026-01-01', '2026-02-01', '2026-02-01', 1500, true, '2027-01-01') $$,
  'an existing founder can hold a second founder subscription');
select lives_ok($$ insert into merqo.subscriptions (vendor_id, plan_slug, interval, current_period_start, current_period_end, renewal_anchor, locked_price_cents)
  values ('36000000-0000-0000-0000-000000000021', 'loopkit', 'month', '2026-01-01', '2026-02-01', '2026-02-01', 1000) $$,
  'a non-founder subscription is unaffected by the cap');
select throws_ok($$ update merqo.subscriptions set founder = true, founder_until = '2027-01-01'
  where vendor_id = '36000000-0000-0000-0000-000000000021' $$,
  '23514', 'founder cap of 20 reached', 'flipping a 21st vendor to founder is refused');
select lives_ok($$ update merqo.subscriptions set founder_until = '2026-06-01' where vendor_id = '36000000-0000-0000-0000-000000000003' $$,
  'ending founder benefits keeps the badge flag and is allowed at the cap');

-- billing_credits.
select throws_ok($$ insert into merqo.billing_credits (vendor_id, amount_cents, reason)
  values ('36000000-0000-0000-0000-000000000001', 0, 'zero') $$,
  '23514', null, 'a zero credit is rejected');
insert into merqo.billing_credits (vendor_id, amount_cents, reason, source_subscription_id)
select vendor_id, 6667, 'aa upgrade', id from merqo.subscriptions
where vendor_id = '36000000-0000-0000-0000-000000000001' and plan_slug = 'qkit' and status = 'active';

-- RLS and grants.
select ok(not has_table_privilege('authenticated', 'merqo.subscriptions', p), 'authenticated has no ' || p || ' on subscriptions')
from unnest(array['INSERT', 'UPDATE', 'DELETE']) p;
select ok(not has_table_privilege('anon', 'merqo.subscriptions', 'SELECT'), 'anon has no access to subscriptions');
select ok(not has_table_privilege('anon', 'merqo.billing_credits', 'SELECT'), 'anon has no access to billing_credits');
select ok(not has_table_privilege('authenticated', 'merqo.plans', 'INSERT'), 'authenticated cannot write plans');
select ok(has_table_privilege('service_role', 'merqo.subscriptions', 'INSERT'), 'service role writes subscriptions');
select ok(not has_function_privilege(r, 'merqo.enforce_founder_cap()', 'EXECUTE'), r || ' cannot execute the founder cap function')
from unnest(array['anon', 'authenticated', 'service_role']) r;

set local role anon;
select set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
select is((select count(*)::int from merqo.plans), 7, 'anon reads only active plans');
select is((select count(*)::int from merqo.plans where slug = 'paykit'), 0, 'anon cannot see inactive paykit');
select throws_ok($$ select 1 from merqo.subscriptions $$, '42501', null, 'anon cannot read subscriptions');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '36000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
select is((select count(*)::int from merqo.plans), 7, 'a vendor reads only active plans');
select is((select count(*)::int from merqo.subscriptions where vendor_id <> '36000000-0000-0000-0000-000000000001'), 0, 'a vendor reads no other vendor subscription');
select cmp_ok((select count(*)::int from merqo.subscriptions), '>', 0, 'a vendor reads their own subscriptions');
select is((select count(*)::int from merqo.billing_credits), 1, 'a vendor reads their own credits');
select throws_ok($$ update merqo.subscriptions set locked_price_cents = 0 $$, '42501', null, 'a vendor cannot update subscriptions');
select set_config('request.jwt.claims', json_build_object('sub', '36000000-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
select is((select count(*)::int from merqo.billing_credits), 0, 'another vendor reads no credits');
select set_config('request.jwt.claims', json_build_object('sub', '36000000-0000-0000-0000-000000000023', 'role', 'authenticated')::text, true);
select is((select count(*)::int from merqo.plans), 8, 'the team reads inactive plans too');
select cmp_ok((select count(*)::int from merqo.subscriptions), '>=', 20, 'the team reads every subscription');
reset role;

select * from finish();
rollback;
