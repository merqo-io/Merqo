-- Fixed-window request counters for per-IP / per-user rate limits (CCSP C3).
-- Counters live in Postgres because serverless instances share no memory, so
-- an in-process map would give each cold instance its own fresh allowance.
-- Only the service-role client (server actions and route handlers) may call
-- the function; the table has no client grants and RLS stays default-deny.

create table if not exists merqo.rate_limit_hits (
  bucket_key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket_key, window_start)
);

create index if not exists rate_limit_hits_window_start_idx
  on merqo.rate_limit_hits (window_start);

alter table merqo.rate_limit_hits enable row level security;
revoke all on merqo.rate_limit_hits from public, anon, authenticated;
grant select, insert, update, delete on merqo.rate_limit_hits to service_role;

-- Counts one hit for p_key in the current window and returns true while the
-- count is within p_limit. Expired windows are swept on ~1% of calls so the
-- table stays small without a scheduled job.
create or replace function merqo.rate_limit_hit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_start timestamptz;
  v_hits integer;
begin
  if p_window_seconds < 1 or p_limit < 1 then
    raise exception 'rate_limit_hit: limit and window must be positive';
  end if;

  v_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  -- Sampled so the sweep cost is not paid on every request; the window_start
  -- index keeps each sweep bounded, and any row is eventually collected.
  if random() < 0.01 then
    delete from merqo.rate_limit_hits
    where window_start < now() - interval '1 day';
  end if;

  insert into merqo.rate_limit_hits as h (bucket_key, window_start, hits)
  values (p_key, v_start, 1)
  on conflict (bucket_key, window_start)
  do update set hits = h.hits + 1
  returning h.hits into v_hits;

  return v_hits <= p_limit;
end;
$$;

revoke execute on function merqo.rate_limit_hit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function merqo.rate_limit_hit(text, integer, integer)
  to service_role;
