begin;
select no_plan();

select ok(merqo.rate_limit_hit('t:a', 2, 3600), 'first hit is allowed');
select ok(merqo.rate_limit_hit('t:a', 2, 3600), 'second hit is allowed');
select ok(not merqo.rate_limit_hit('t:a', 2, 3600), 'third hit exceeds the limit');
select ok(merqo.rate_limit_hit('t:b', 2, 3600), 'a different key has its own allowance');

select is(
  (select hits from merqo.rate_limit_hits where bucket_key = 't:a'),
  3,
  'every hit is counted, including rejected ones'
);

select throws_ok(
  $$ select merqo.rate_limit_hit('t:c', 0, 60) $$,
  'rate_limit_hit: limit and window must be positive',
  'a non-positive limit is rejected'
);

select ok(
  not has_function_privilege('authenticated', 'merqo.rate_limit_hit(text,integer,integer)', 'execute'),
  'authenticated cannot execute the limiter'
);
select ok(
  has_function_privilege('service_role', 'merqo.rate_limit_hit(text,integer,integer)', 'execute'),
  'service_role can execute the limiter'
);

select * from finish();
rollback;
