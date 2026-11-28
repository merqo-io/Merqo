-- Gives the demo vendor two connected kits, as a kit's own sign-up would after
-- the vendor joined it on that kit's site. Local Supabase only. Runs after the
-- demo account exists (record.mjs one-account runs it off camera).

insert into merqo.vendor_links (email, product_slug, status)
select 'demo-vendor@merqo.example', slug, 'active'
from merqo.products
where slug in ('qkit', 'loopkit')
on conflict (email, product_slug) do update set status = 'active';
