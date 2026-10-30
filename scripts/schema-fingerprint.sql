-- One row per schema object across the six kit schemas: (schema, kind, name, md5).
-- Run in the Supabase SQL editor (or psql --csv) and save the result as CSV.
-- See docs/SCHEMA-DRIFT.md.
with kit_schemas(nspname) as (
  values ('merqo'), ('qkit'), ('loopkit'), ('paykit'), ('stockkit'), ('printkit')
),
kit_ns as (
  select n.oid, n.nspname from pg_namespace n join kit_schemas using (nspname)
),
rels as (
  select c.oid, c.relname, c.relkind, c.relacl, c.relowner, c.relrowsecurity,
         c.relforcerowsecurity, n.nspname
  from pg_class c join kit_ns n on n.oid = c.relnamespace
  where c.relkind in ('r', 'p', 'v', 'm', 'S', 'f')
),
funcs as (
  select p.oid, p.proname, p.proacl, p.proowner, p.prokind, n.nspname,
         p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as signature
  from pg_proc p join kit_ns n on n.oid = p.pronamespace
  where p.prokind in ('f', 'p')
    and not exists (
      select 1 from pg_depend d
      where d.objid = p.oid and d.classid = 'pg_proc'::regclass and d.deptype = 'e'
    )
),
objects(schema, kind, name, body) as (
  select nspname, 'table', relname,
         relkind::text || '|rls=' || relrowsecurity || '|force=' || relforcerowsecurity
  from rels
  union all
  select r.nspname, 'column', r.relname || '.' || a.attname,
         format_type(a.atttypid, a.atttypmod) || '|notnull=' || a.attnotnull
           || '|default=' || coalesce(pg_get_expr(d.adbin, d.adrelid), '')
  from rels r
  join pg_attribute a on a.attrelid = r.oid and a.attnum > 0 and not a.attisdropped
  left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
  where r.relkind in ('r', 'p', 'v', 'm', 'f')
  union all
  select r.nspname, 'constraint', r.relname || '.' || con.conname,
         pg_get_constraintdef(con.oid)
  from rels r join pg_constraint con on con.conrelid = r.oid
  union all
  select r.nspname, 'index', r.relname || '.' || i.relname,
         pg_get_indexdef(i.oid)
  from rels r
  join pg_index x on x.indrelid = r.oid
  join pg_class i on i.oid = x.indexrelid
  union all
  select tn.nspname, 'trigger', tc.relname || '.' || t.tgname,
         pg_get_triggerdef(t.oid) || '|enabled=' || t.tgenabled::text
  from pg_trigger t
  join pg_class tc on tc.oid = t.tgrelid
  join pg_namespace tn on tn.oid = tc.relnamespace
  join pg_proc tp on tp.oid = t.tgfoid
  where not t.tgisinternal
    and (tn.nspname in (select nspname from kit_schemas)
         or tp.pronamespace in (select oid from kit_ns))
  union all
  select schemaname, 'policy', tablename || '.' || policyname,
         cmd || '|' || permissive || '|' || array_to_string(roles, ',')
           || '|using=' || coalesce(qual, '') || '|check=' || coalesce(with_check, '')
  from pg_policies
  where schemaname in (select nspname from kit_schemas) or schemaname = 'storage'
  union all
  select nspname, 'function', signature, pg_get_functiondef(oid)
  from funcs
  union all
  select r.nspname, 'grant', r.relname || ':' || coalesce(g.rolname, 'public'),
         string_agg(acl.privilege_type, ',' order by acl.privilege_type)
  from rels r
  cross join lateral aclexplode(coalesce(r.relacl, acldefault(
    case when r.relkind = 'S' then 's' else 'r' end::"char", r.relowner))) acl
  left join pg_roles g on g.oid = acl.grantee
  group by r.nspname, r.relname, g.rolname
  union all
  select f.nspname, 'routine_grant', f.signature || ':' || coalesce(g.rolname, 'public'),
         string_agg(acl.privilege_type, ',' order by acl.privilege_type)
  from funcs f
  cross join lateral aclexplode(coalesce(f.proacl, acldefault('f', f.proowner))) acl
  left join pg_roles g on g.oid = acl.grantee
  group by f.nspname, f.signature, g.rolname
)
select schema, kind, name, md5(body) as md5
from objects
order by schema, kind, name;
