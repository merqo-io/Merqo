begin;
select no_plan();

insert into auth.users (id, instance_id, aud, role, email)
select ('45000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
       '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'founder-' || n || '@test.local'
from generate_series(1, 23) n;
insert into merqo.merqo_team (user_id) values ('45000000-0000-0000-0000-000000000023');

select is((select count(*)::int from merqo.billing_config), 1, 'billing_config has its single row');
select is((select billing_opens_at from merqo.billing_config), null, 'billing opens at nothing until the team sets it');
select throws_ok($$ insert into merqo.billing_config (id) values (false) $$, '23514', null, 'a second billing_config row is rejected');
select throws_ok($$ insert into merqo.founder_numbers (number, vendor_id) values (21, '45000000-0000-0000-0000-000000000001') $$,
  '23514', null, 'a founder number above 20 is rejected');

delete from merqo.founder_numbers;
select is(merqo.founder_spots_left(), 20, 'twenty spots are left with no founders');

-- Numbers go to the lowest free slot in order of becoming a founder.
insert into merqo.subscriptions (vendor_id, plan_slug, interval, current_period_start, current_period_end, renewal_anchor, locked_price_cents, founder, founder_until, created_at)
values
  ('45000000-0000-0000-0000-000000000003', 'qkit', 'year', '2026-01-01', '2027-01-01', '2027-01-01', 19900, true, '2027-01-01', '2026-01-03'),
  ('45000000-0000-0000-0000-000000000001', 'qkit', 'year', '2026-01-01', '2027-01-01', '2027-01-01', 19900, true, '2027-01-01', '2026-01-01'),
  ('45000000-0000-0000-0000-000000000002', 'all_access', 'year', '2026-01-01', '2027-01-01', '2027-01-01', 19900, true, '2027-01-01', '2026-01-02');
select results_eq(
  $$ select right(vendor_id::text, 1)::int, number::int from merqo.founder_numbers order by number $$,
  $$ values (3, 1), (1, 2), (2, 3) $$,
  'numbers follow insertion order');
select is(merqo.founder_spots_left(), 17, 'spots left counts distinct founder vendors');

-- Backfill: the migration numbers existing founders by earliest founder row.
delete from merqo.founder_numbers;
insert into merqo.founder_numbers (number, vendor_id)
select (row_number() over (order by first_at, vendor_id))::smallint, vendor_id
from (select vendor_id, min(created_at) as first_at from merqo.subscriptions where founder group by vendor_id) f;
select results_eq(
  $$ select right(vendor_id::text, 1)::int, number::int from merqo.founder_numbers order by number $$,
  $$ values (1, 1), (2, 2), (3, 3) $$,
  'backfill numbers by earliest founder row');

-- A number is kept for good and never reassigned.
update merqo.subscriptions set founder_until = '2026-02-01' where vendor_id = '45000000-0000-0000-0000-000000000001';
select is((select number::int from merqo.founder_numbers where vendor_id = '45000000-0000-0000-0000-000000000001'), 1,
  'a number survives founder_until passing');
insert into merqo.subscriptions (vendor_id, plan_slug, interval, current_period_start, current_period_end, renewal_anchor, locked_price_cents, founder, founder_until)
values ('45000000-0000-0000-0000-000000000001', 'all_access', 'year', '2026-01-01', '2027-01-01', '2027-01-01', 19900, true, '2027-01-01');
select is((select count(*)::int from merqo.founder_numbers where vendor_id = '45000000-0000-0000-0000-000000000001'), 1,
  'a second founder row does not take a second number');

-- Flipping an existing subscription to founder assigns a number too.
insert into merqo.subscriptions (vendor_id, plan_slug, interval, current_period_start, current_period_end, renewal_anchor, locked_price_cents)
values ('45000000-0000-0000-0000-000000000004', 'qkit', 'year', '2026-01-01', '2027-01-01', '2027-01-01', 19900);
select is((select count(*)::int from merqo.founder_numbers where vendor_id = '45000000-0000-0000-0000-000000000004'), 0, 'a non-founder has no number');
update merqo.subscriptions set founder = true, founder_until = '2027-01-01' where vendor_id = '45000000-0000-0000-0000-000000000004';
select is((select number::int from merqo.founder_numbers where vendor_id = '45000000-0000-0000-0000-000000000004'), 4, 'flipping to founder assigns the next number');

-- Fill to 20 and refuse the 21st.
insert into merqo.subscriptions (vendor_id, plan_slug, interval, current_period_start, current_period_end, renewal_anchor, locked_price_cents, founder, founder_until)
select ('45000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid, 'qkit', 'year', '2026-01-01', '2027-01-01', '2027-01-01', 19900, true, '2027-01-01'
from generate_series(5, 20) n;
select is((select max(number)::int from merqo.founder_numbers), 20, 'twenty founders hold numbers 1 to 20');
select is(merqo.founder_spots_left(), 0, 'no spots are left at twenty founders');
select throws_ok($$ insert into merqo.subscriptions (vendor_id, plan_slug, interval, current_period_start, current_period_end, renewal_anchor, locked_price_cents, founder, founder_until)
  values ('45000000-0000-0000-0000-000000000021', 'qkit', 'year', '2026-01-01', '2027-01-01', '2027-01-01', 19900, true, '2027-01-01') $$,
  '23514', 'founder cap of 20 reached', 'a 21st founder is refused');

-- Close by date: past billing_opens_at + 60 days only existing founders can change.
delete from merqo.subscriptions where vendor_id in
  (select ('45000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid from generate_series(5, 20) n);
delete from merqo.founder_numbers where number > 4;
update merqo.billing_config set billing_opens_at = now() - interval '59 days';
select is(merqo.founder_spots_left(), 16, 'inside 60 days the spots stay open');
select lives_ok($$ insert into merqo.subscriptions (vendor_id, plan_slug, interval, current_period_start, current_period_end, renewal_anchor, locked_price_cents, founder, founder_until)
  values ('45000000-0000-0000-0000-000000000005', 'qkit', 'year', '2026-01-01', '2027-01-01', '2027-01-01', 19900, true, '2027-01-01') $$,
  'a new founder is allowed inside 60 days');
update merqo.billing_config set billing_opens_at = now() - interval '61 days';
select is(merqo.founder_spots_left(), 0, 'past 60 days no spots are left');
select throws_ok($$ insert into merqo.subscriptions (vendor_id, plan_slug, interval, current_period_start, current_period_end, renewal_anchor, locked_price_cents, founder, founder_until)
  values ('45000000-0000-0000-0000-000000000006', 'qkit', 'year', '2026-01-01', '2027-01-01', '2027-01-01', 19900, true, '2027-01-01') $$,
  '23514', 'founder offer closed', 'a new founder is refused after the close date');
select lives_ok($$ update merqo.subscriptions set founder_until = '2028-01-01' where vendor_id = '45000000-0000-0000-0000-000000000001' and founder $$,
  'an existing founder can still be updated after the close date');
select lives_ok($$ insert into merqo.subscriptions (vendor_id, plan_slug, interval, current_period_start, current_period_end, renewal_anchor, locked_price_cents, founder, founder_until)
  values ('45000000-0000-0000-0000-000000000002', 'qkit', 'year', '2027-01-01', '2028-01-01', '2028-01-01', 19900, true, '2028-01-01') $$,
  'an existing founder can renew as founder after the close date');
update merqo.billing_config set billing_opens_at = null;
select is(merqo.founder_spots_left(), 15, 'clearing the open date reopens the offer');

-- Erasing a founder's account retires the number; it is never handed out again.
delete from auth.users where id = '45000000-0000-0000-0000-000000000005';
select is((select count(*)::int from merqo.founder_numbers where number = 5 and vendor_id is null), 1,
  'an erased founder keeps the number, retired');
insert into merqo.subscriptions (vendor_id, plan_slug, interval, current_period_start, current_period_end, renewal_anchor, locked_price_cents, founder, founder_until)
values ('45000000-0000-0000-0000-000000000007', 'qkit', 'year', '2026-01-01', '2027-01-01', '2027-01-01', 19900, true, '2027-01-01');
select is((select number::int from merqo.founder_numbers where vendor_id = '45000000-0000-0000-0000-000000000007'), 6,
  'the next founder skips the retired number');

-- Retired numbers still count against the cap.
insert into merqo.subscriptions (vendor_id, plan_slug, interval, current_period_start, current_period_end, renewal_anchor, locked_price_cents, founder, founder_until)
select ('45000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid, 'qkit', 'year', '2026-01-01', '2027-01-01', '2027-01-01', 19900, true, '2027-01-01'
from generate_series(8, 21) n;
delete from auth.users where id = '45000000-0000-0000-0000-000000000008';
select is(merqo.founder_spots_left(), 0, 'an erased founder does not free a spot');
select throws_ok($$ insert into merqo.subscriptions (vendor_id, plan_slug, interval, current_period_start, current_period_end, renewal_anchor, locked_price_cents, founder, founder_until)
  values ('45000000-0000-0000-0000-000000000022', 'qkit', 'year', '2026-01-01', '2027-01-01', '2027-01-01', 19900, true, '2027-01-01') $$,
  '23514', 'founder cap of 20 reached', 'a new founder is refused while retired numbers fill the cap');

-- RLS and grants.
select ok(not has_function_privilege(r, f, 'EXECUTE'), r || ' cannot execute ' || f)
from unnest(array['anon', 'authenticated', 'service_role']) r,
     unnest(array['merqo.founder_offer_closed()', 'merqo.assign_founder_number()']) f;
select ok(has_function_privilege(r, 'merqo.founder_spots_left()', 'EXECUTE'), r || ' can read founder spots left')
from unnest(array['anon', 'authenticated']) r;
select ok(not has_table_privilege('anon', t, 'SELECT'), 'anon has no access to ' || t)
from unnest(array['merqo.founder_numbers', 'merqo.billing_config']) t;
select ok(not has_table_privilege('authenticated', 'merqo.founder_numbers', p), 'authenticated cannot ' || p || ' founder_numbers')
from unnest(array['INSERT', 'UPDATE', 'DELETE']) p;

set local role anon;
select set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
select is(merqo.founder_spots_left(), 0, 'anon reads the spots left');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '45000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
select is((select count(*)::int from merqo.founder_numbers), 0, 'a vendor cannot read founder numbers');
select is((select count(*)::int from merqo.billing_config), 0, 'a vendor cannot read billing_config');
update merqo.billing_config set billing_opens_at = now();
reset role;
select is((select billing_opens_at from merqo.billing_config), null, 'a vendor cannot update billing_config');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '45000000-0000-0000-0000-000000000023', 'role', 'authenticated')::text, true);
select ok((select count(*)::int from merqo.founder_numbers) > 0, 'the team reads founder numbers');
select is((select count(*)::int from merqo.billing_config), 1, 'the team reads billing_config');
update merqo.billing_config set billing_opens_at = '2026-12-01';
reset role;
select is((select billing_opens_at from merqo.billing_config), '2026-12-01'::timestamptz, 'the team updates billing_config');

select * from finish();
rollback;
