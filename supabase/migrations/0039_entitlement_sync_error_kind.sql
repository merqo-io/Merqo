-- Why the last push failed (route missing, response not understood, network),
-- so the admin page can say more than the HTTP code. Null for rows written
-- before this column existed and for successful pushes. The table's existing
-- RLS (team select only) and grants cover the new column.
alter table merqo.entitlement_sync
  add column last_error_kind text
  check (last_error_kind in ('unconfigured', 'network', 'http', 'parse', 'schema'));
