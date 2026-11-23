begin;
select plan(14);

insert into auth.users (id, instance_id, aud, role, email)
select ('48000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
       '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ledger-' || n || '@test.local'
from generate_series(1, 2) n;
insert into merqo.merqo_team (user_id) values ('48000000-0000-0000-0000-000000000002');

select is((select revenue_cap_cents from merqo.billing_config), null, 'the cap is null by default');
select is((select revenue_window_start from merqo.billing_config), null, 'the window start is null by default');
select throws_ok($$ update merqo.billing_config set revenue_cap_cents = 0 $$, '23514', null, 'a zero cap is rejected');

select throws_ok($$ insert into merqo.payments (amount_cents, received_on) values (0, '2026-03-01') $$, '23514', null, 'a zero amount is rejected');
select throws_ok($$ insert into merqo.payments (amount_cents, received_on, method) values (100, '2026-03-01', 'cash') $$, '23514', null, 'an unknown method is rejected');

insert into merqo.payments (vendor_id, amount_cents, received_on, reference) values
  ('48000000-0000-0000-0000-000000000001', 123456, '2026-03-01', 'ref-a'),
  ('48000000-0000-0000-0000-000000000001', 1000, '2025-12-31', null),
  (null, 500, '2026-04-01', null);

select is((select method from merqo.payments where reference = 'ref-a'), 'paynow', 'method defaults to paynow');
select is(merqo.revenue_total('2026-01-01'), 123956::bigint, 'the total counts payments on or after the window start');
select is(merqo.revenue_total('2027-01-01'), 0::bigint, 'an empty window totals zero');
select results_eq(
  $$ select vendor_email, amount_cents from merqo.recent_payments(2) $$,
  $$ values (null::text, 500), ('ledger-1@test.local'::text, 123456) $$,
  'recent payments are newest first with the vendor email');

delete from auth.users where id = '48000000-0000-0000-0000-000000000001';
select is((select count(*)::int from merqo.payments where vendor_id is null), 3, 'erasing a vendor keeps the payments');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '48000000-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
select is((select count(*)::int from merqo.payments), 3, 'a team member reads payments');
select throws_ok($$ insert into merqo.payments (amount_cents, received_on) values (100, '2026-03-01') $$, '42501', null, 'a team member cannot insert directly');
select throws_ok($$ select merqo.revenue_total('2026-01-01') $$, '42501', null, 'authenticated cannot call the total');

select set_config('request.jwt.claims', json_build_object('sub', '48000000-0000-0000-0000-000000000099', 'role', 'authenticated')::text, true);
select is((select count(*)::int from merqo.payments), 0, 'a non-team user reads nothing');

reset role;
select * from finish();
rollback;
