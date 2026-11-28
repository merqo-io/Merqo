-- Demo reset: wipe the fixed demo vendor so every recording starts identical.
-- Run against LOCAL Supabase only (the recorder refuses a non-loopback
-- DEMO_DB_URL), never prod.
--
-- The recorder registers this exact email live on camera, so the account must
-- not already exist. The legal acceptance is seeded by email ahead of sign-up
-- (merqo keys it by email, not user id) so the new vendor lands on the
-- dashboard instead of the /legal/accept interstitial. The far-future version
-- keeps the seed current whenever LEGAL_VERSIONS in @merqo/ui moves on.

delete from merqo.vendor_links where email = 'demo-vendor@merqo.example';
delete from merqo.legal_acceptances where vendor_email = 'demo-vendor@merqo.example';
delete from auth.users where email = 'demo-vendor@merqo.example';

insert into merqo.legal_acceptances
  (vendor_email, doc_type, doc_version, doc_sha256, kit_slug)
values
  ('demo-vendor@merqo.example', 'terms', '9999-12-31', 'demo', 'merqo'),
  ('demo-vendor@merqo.example', 'privacy', '9999-12-31', 'demo', 'merqo');
