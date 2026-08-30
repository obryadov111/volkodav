CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.auditor_organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT auditor_organizations_pkey PRIMARY KEY (id)
);

CREATE TABLE public.client_organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  industry text,
  country text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT client_organizations_pkey PRIMARY KEY (id)
);

CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  permissions jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT user_roles_pkey PRIMARY KEY (id)
);

CREATE TABLE public.hardening_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_type text,
  rule_code text UNIQUE,
  title text NOT NULL,
  description text,
  expected_value text,
  source text,
  severity text CHECK (severity = ANY (ARRAY['info'::text, 'low'::text, 'medium'::text, 'high'::text, 'critical'::text])),
  remediation text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT hardening_rules_pkey PRIMARY KEY (id)
);

CREATE TABLE public.hardening_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  total_checks integer DEFAULT 0,
  passed integer DEFAULT 0,
  failed integer DEFAULT 0,
  compliance_score double precision,
  generated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT hardening_reports_pkey PRIMARY KEY (id),
  CONSTRAINT hardening_reports_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.client_organizations(id)
);

CREATE TABLE public.environments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  name text NOT NULL,
  CONSTRAINT environments_pkey PRIMARY KEY (id),
  CONSTRAINT environments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.client_organizations(id)
);

CREATE TABLE public.policies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  scope text,
  status text NOT NULL DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'active'::text, 'review'::text, 'archived'::text])),
  owner_name text,
  source text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT policies_pkey PRIMARY KEY (id),
  CONSTRAINT policies_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.client_organizations(id)
);

CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  full_name text,
  display_name text,
  role_id uuid,
  organization_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  is_superadmin boolean NOT NULL DEFAULT false,
  account_status text NOT NULL DEFAULT 'active'::text CHECK (account_status = ANY (ARRAY['pending'::text, 'active'::text, 'blocked'::text])),
  must_change_password boolean NOT NULL DEFAULT false,
  last_login_at timestamp with time zone,
  failed_login_attempts integer NOT NULL DEFAULT 0,
  blocked_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.user_roles(id),
  CONSTRAINT users_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.auditor_organizations(id)
);

CREATE TABLE public.user_2fa (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  secret_encrypted text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  backup_codes_hashes jsonb NOT NULL DEFAULT '[]'::jsonb,
  confirmed_at timestamp with time zone,
  last_used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_2fa_pkey PRIMARY KEY (id),
  CONSTRAINT user_2fa_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE public.user_organizations (
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'viewer'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_organizations_pkey PRIMARY KEY (user_id, organization_id),
  CONSTRAINT user_organizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_organizations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.client_organizations(id)
);

CREATE TABLE public.ingestion_batches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  received_at timestamp with time zone DEFAULT now(),
  source text,
  status text DEFAULT 'completed'::text CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])),
  assets_count integer DEFAULT 0,
  software_count integer DEFAULT 0,
  checks_count integer DEFAULT 0,
  report_id uuid,
  notes text,
  scan_label text,
  CONSTRAINT ingestion_batches_pkey PRIMARY KEY (id),
  CONSTRAINT ingestion_batches_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.hardening_reports(id),
  CONSTRAINT ingestion_batches_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.client_organizations(id)
);

CREATE TABLE public.assets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  environment_id uuid,
  hostname text NOT NULL,
  ip_address text,
  os text,
  asset_type text,
  criticality text CHECK (criticality = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT assets_pkey PRIMARY KEY (id),
  CONSTRAINT assets_environment_id_fkey FOREIGN KEY (environment_id) REFERENCES public.environments(id)
);

CREATE TABLE public.software (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  asset_id uuid,
  name text NOT NULL,
  version text,
  vendor text,
  category text,
  type text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT software_pkey PRIMARY KEY (id),
  CONSTRAINT software_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id)
);

CREATE TABLE public.configs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  software_id uuid,
  config_data jsonb NOT NULL,
  collected_at timestamp with time zone DEFAULT now(),
  CONSTRAINT configs_pkey PRIMARY KEY (id),
  CONSTRAINT configs_software_id_fkey FOREIGN KEY (software_id) REFERENCES public.software(id)
);

CREATE TABLE public.scan_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  scan_number integer NOT NULL,
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  total_checks integer DEFAULT 0,
  passed integer DEFAULT 0,
  failed integer DEFAULT 0,
  compliance_score numeric,
  exported_pdf_path text,
  exported_excel_path text,
  created_at timestamp with time zone DEFAULT now(),
  ingestion_batch_id uuid,
  snapshot_label text,
  status text DEFAULT 'completed'::text CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])),
  total_assets integer NOT NULL DEFAULT 0,
  total_software integer NOT NULL DEFAULT 0,
  notes text,
  CONSTRAINT scan_snapshots_pkey PRIMARY KEY (id),
  CONSTRAINT scan_snapshots_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.client_organizations(id),
  CONSTRAINT scan_snapshots_ingestion_batch_id_fkey FOREIGN KEY (ingestion_batch_id) REFERENCES public.ingestion_batches(id)
);

CREATE TABLE public.agent_collections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  asset_id uuid,
  batch_id uuid,
  collected_data jsonb NOT NULL,
  collected_at timestamp with time zone DEFAULT now(),
  CONSTRAINT agent_collections_pkey PRIMARY KEY (id),
  CONSTRAINT agent_collections_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id),
  CONSTRAINT agent_collections_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.ingestion_batches(id)
);

CREATE TABLE public.hardening_checks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  asset_id uuid,
  rule_id uuid,
  actual_value text,
  expected_value text,
  status text CHECK (status = ANY (ARRAY['pass'::text, 'fail'::text, 'error'::text, 'skipped'::text])),
  checked_at timestamp with time zone DEFAULT now(),
  CONSTRAINT hardening_checks_pkey PRIMARY KEY (id),
  CONSTRAINT hardening_checks_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id),
  CONSTRAINT hardening_checks_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.hardening_rules(id)
);

CREATE TABLE public.scan_check_results (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  snapshot_id uuid,
  asset_id uuid,
  rule_id uuid,
  actual_value text,
  expected_value text,
  status text CHECK (status = ANY (ARRAY['pass'::text, 'fail'::text, 'error'::text, 'skipped'::text])),
  checked_at timestamp with time zone DEFAULT now(),
  CONSTRAINT scan_check_results_pkey PRIMARY KEY (id),
  CONSTRAINT scan_check_results_snapshot_id_fkey FOREIGN KEY (snapshot_id) REFERENCES public.scan_snapshots(id),
  CONSTRAINT scan_check_results_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id),
  CONSTRAINT scan_check_results_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.hardening_rules(id)
);
