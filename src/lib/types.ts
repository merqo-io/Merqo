export type SocialLinks = {
  website?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
};

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// merqo.admin_audit (0021_admin_audit.sql).
export type AdminAudit = {
  id: string;
  admin_id: string;
  action: string;
  target_id: string | null;
  detail: Json | null;
  created_at: string;
};

/** merqo.marketing_consents: one row per email that ticked the updates box. */
export type MarketingConsent = {
  email: string;
  wording: string;
  consented_at: string;
  withdrawn_at: string | null;
};
