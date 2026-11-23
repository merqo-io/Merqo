begin;
select no_plan();

insert into auth.users (id, instance_id, aud, role, email) values
  ('47000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pause-a@test.local'),
  ('47000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pause-b@test.local'),
  ('47000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pause-team@test.local');
insert into merqo.merqo_team (user_id) values ('47000000-0000-0000-0000-000000000003');

insert into merqo.subscriptions
  (id, vendor_id, plan_slug, interval, current_period_start, current_period_end, renewal_anchor, locked_price_cents, included_kits)
values
  ('47aaaaaa-0000-0000-0000-000000000001', '47000000-0000-0000-0000-000000000001', 'starter', 'month',
   date '2030-01-01', date '2030-02-01', date '2030-01-01', 1490, '{qkit,paykit}'),
  ('47aaaaaa-0000-0000-0000-000000000002', '47000000-0000-0000-0000-000000000002', 'starter', 'month',
   date '2030-01-01', date '2030-02-01', date '2030-01-01', 1490, '{qkit,paykit}');

select has_table('merqo', 'subscription_pauses', 'subscription_pauses exists');
select has_column('merqo', 'subscriptions', 'scheduled_plan_slug', 'subscriptions can hold a scheduled plan');
select ok((select relrowsecurity from pg_class where oid = 'merqo.subscription_pauses'::regclass),
  'subscription_pauses has row level security on');
select ok(not has_function_privilege('authenticated', 'merqo.pause_subscription(uuid, date, date, text, uuid)', 'EXECUTE'),
  'authenticated cannot pause a subscription');
select ok(not has_function_privilege('anon', 'merqo.end_pause(uuid, date)', 'EXECUTE'),
  'anon cannot end a pause');
select ok(has_function_privilege('service_role', 'merqo.pause_subscription(uuid, date, date, text, uuid)', 'EXECUTE'),
  'service_role can pause a subscription');

select throws_ok($$ insert into merqo.subscription_pauses (subscription_id, starts_on, ends_on)
  values ('47aaaaaa-0000-0000-0000-000000000001', date '2030-01-10', date '2030-01-10') $$,
  '23514', null, 'a pause must end after it starts');

select isnt(merqo.pause_subscription('47aaaaaa-0000-0000-0000-000000000001', current_date + 10, current_date + 40, 'holiday'),
  null, 'a 30 day pause is accepted');
select is((select current_period_end from merqo.subscriptions where id = '47aaaaaa-0000-0000-0000-000000000001'),
  (date '2030-02-01' + 30)::timestamptz, 'the paid period grows by the paused days');

select throws_ok($$ select merqo.pause_subscription('47aaaaaa-0000-0000-0000-000000000001', current_date + 20, current_date + 50, 'x') $$,
  '23514', 'pause overlaps an existing pause', 'an overlapping pause is rejected');
select throws_ok($$ select merqo.pause_subscription('47aaaaaa-0000-0000-0000-000000000001', current_date + 30, current_date + 35, 'x') $$,
  '23514', 'pause overlaps an existing pause', 'a pause inside an existing one is rejected');
select throws_ok($$ select merqo.pause_subscription('47aaaaaa-0000-0000-0000-000000000001', current_date - 30, current_date - 20, 'x') $$,
  '23514', 'pause cannot start in the past', 'a pause in the past is rejected');
select throws_ok($$ select merqo.pause_subscription('47aaaaaa-0000-0000-0000-000000000001', current_date + 60, current_date + 60, 'x') $$,
  '23514', 'pause must end after it starts', 'an empty pause is rejected');

select isnt(merqo.pause_subscription('47aaaaaa-0000-0000-0000-000000000001', current_date + 100, current_date + 160, 'second'),
  null, 'a second pause up to 90 days in total is accepted');
select throws_ok($$ select merqo.pause_subscription('47aaaaaa-0000-0000-0000-000000000001', current_date + 200, current_date + 203, 'third') $$,
  '23514', 'pause cap of 92 days in 365 reached', 'a pause past 92 days in a year is rejected');
select isnt(merqo.pause_subscription('47aaaaaa-0000-0000-0000-000000000001', current_date + 200, current_date + 202, 'tiny'),
  null, 'a pause that lands exactly on 92 days is accepted');
select is((select count(*)::int from merqo.subscription_pauses where subscription_id = '47aaaaaa-0000-0000-0000-000000000001'), 3,
  'the rejected pauses left no rows');
select isnt(merqo.pause_subscription('47aaaaaa-0000-0000-0000-000000000001', current_date + 470, current_date + 500, 'next year'),
  null, 'a pause after the earlier ones age out of the window is accepted');

select throws_ok($$ select merqo.pause_subscription('47aaaaaa-0000-0000-0000-000000000002', current_date + 5, current_date + 100, 'long') $$,
  '23514', 'pause cap of 92 days in 365 reached', 'a single pause over 92 days is rejected');

update merqo.subscriptions set status = 'canceled' where id = '47aaaaaa-0000-0000-0000-000000000002';
select throws_ok($$ select merqo.pause_subscription('47aaaaaa-0000-0000-0000-000000000002', current_date + 5, current_date + 10, 'x') $$,
  '23514', 'subscription is not active', 'a closed subscription cannot be paused');

insert into merqo.subscriptions
  (id, vendor_id, plan_slug, interval, current_period_start, current_period_end, renewal_anchor, locked_price_cents, included_kits)
values
  ('47aaaaaa-0000-0000-0000-000000000003', '47000000-0000-0000-0000-000000000002', 'qkit', 'month',
   date '2030-01-01', date '2030-02-01', date '2030-01-01', 1990, '{qkit,printkit,paykit}');
select isnt(merqo.pause_subscription('47aaaaaa-0000-0000-0000-000000000003', current_date - 1, current_date + 9, 'running'),
  null, 'a pause that started yesterday is accepted');
select isnt(merqo.pause_subscription('47aaaaaa-0000-0000-0000-000000000003', current_date + 80, current_date + 150, 'later'),
  null, 'a second pause totalling 80 days is accepted');
update merqo.subscriptions set status = 'canceled' where id = '47aaaaaa-0000-0000-0000-000000000003';
insert into merqo.subscriptions
  (id, vendor_id, plan_slug, interval, current_period_start, current_period_end, renewal_anchor, locked_price_cents, included_kits)
values
  ('47aaaaaa-0000-0000-0000-000000000004', '47000000-0000-0000-0000-000000000002', 'starter', 'month',
   date '2030-01-01', date '2030-02-01', date '2030-01-01', 1490, '{qkit,paykit}');
select throws_ok($$ select merqo.pause_subscription('47aaaaaa-0000-0000-0000-000000000004', current_date + 300, current_date + 320, 'swapped') $$,
  '23514', 'pause cap of 92 days in 365 reached', 'the cap follows the vendor across a plan change');

-- Early end: the pause that started yesterday stops today and gives back nine days.
create temp table early on commit drop as
  select sp.id, s.current_period_end as before_end
  from merqo.subscription_pauses sp
  join merqo.subscriptions s on s.id = sp.subscription_id
  where sp.subscription_id = '47aaaaaa-0000-0000-0000-000000000003' and sp.reason = 'running';
select merqo.end_pause((select id from early));
select is((select ends_on from merqo.subscription_pauses where id = (select id from early)), current_date,
  'ending a running pause sets ends_on to today');
select is((select current_period_end from merqo.subscriptions where id = '47aaaaaa-0000-0000-0000-000000000003'),
  (select before_end from early) - interval '9 days', 'the extension shrinks to the days actually paused');
select throws_ok($$ select merqo.end_pause((select id from early)) $$,
  '23514', 'pause already ended', 'an ended pause cannot be ended again');

-- A pause that has not started is removed outright.
create temp table future on commit drop as
  select sp.id from merqo.subscription_pauses sp
  where sp.subscription_id = '47aaaaaa-0000-0000-0000-000000000001' and sp.reason = 'holiday';
select merqo.end_pause((select id from future));
select is((select count(*)::int from merqo.subscription_pauses where id = (select id from future)), 0,
  'ending a pause that has not started removes it');
select is((select current_period_end from merqo.subscriptions where id = '47aaaaaa-0000-0000-0000-000000000001'),
  (date '2030-02-01' + 60 + 2 + 30)::timestamptz, 'its extension is given back in full');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '47000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
select is((select count(*)::int from merqo.subscription_pauses), 0, 'a vendor reads no pauses');
select throws_ok($$ select merqo.pause_subscription('47aaaaaa-0000-0000-0000-000000000001', current_date + 300, current_date + 301, 'x') $$,
  '42501', null, 'a vendor cannot pause directly');
select set_config('request.jwt.claims', json_build_object('sub', '47000000-0000-0000-0000-000000000003', 'role', 'authenticated')::text, true);
select ok((select count(*)::int from merqo.subscription_pauses) > 0, 'a team member reads the pauses');
reset role;

select * from finish();
rollback;
