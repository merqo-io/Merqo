-- Index every foreign key column (Supabase advisor: unindexed foreign keys).
create index if not exists admin_audit_admin_id_idx on merqo.admin_audit (admin_id);
create index if not exists feedback_user_id_idx on merqo.feedback (user_id);
create index if not exists support_messages_user_id_idx on merqo.support_messages (user_id);
create index if not exists telegram_link_tokens_vendor_id_idx on merqo.telegram_link_tokens (vendor_id);
create index if not exists vendor_feedback_vendor_id_idx on merqo.vendor_feedback (vendor_id);
create index if not exists vendor_links_product_slug_idx on merqo.vendor_links (product_slug);
