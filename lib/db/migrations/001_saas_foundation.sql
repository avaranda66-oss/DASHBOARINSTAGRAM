-- ─── 001_saas_foundation.sql ──────────────────────────────────────────────────
-- SaaS Foundation: users, tokens, profit_configs, automation_rules, scheduled_reports
-- Executar no Supabase SQL Editor ou via CLI: supabase db push
-- ──────────────────────────────────────────────────────────────────────────────

-- Habilitar extensão UUID
create extension if not exists "pgcrypto";

-- ─── users ────────────────────────────────────────────────────────────────────
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  meta_user_id  text unique not null,
  name          text,
  email         text,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── user_tokens ──────────────────────────────────────────────────────────────
-- Armazena o long-lived token Meta por usuário (60 dias)
create table if not exists user_tokens (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  access_token    text not null,
  expires_at      timestamptz,
  meta_account_ids text[] not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(user_id)
);

-- ─── profit_configs ───────────────────────────────────────────────────────────
-- Migra ProfitConfig do localStorage (profit-config-slice.ts) para DB
create table if not exists profit_configs (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references users(id) on delete cascade unique,
  cogs_pct                numeric(5,2) not null default 40,
  shipping_pct            numeric(5,2) not null default 8,
  fees_pct                numeric(5,2) not null default 3,
  target_roas_multiplier  numeric(5,2) not null default 1.2,
  enabled                 boolean not null default false,
  updated_at              timestamptz not null default now()
);

-- ─── automation_rules ─────────────────────────────────────────────────────────
-- Migra AutomationRule[] do localStorage (ads-rules-slice.ts) para DB
create table if not exists automation_rules (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  rule_data   jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists automation_rules_user_id_idx on automation_rules(user_id);

-- ─── scheduled_reports ────────────────────────────────────────────────────────
-- Migra ReportSchedule do arquivo JSON (scheduler.service.ts) para DB
create table if not exists scheduled_reports (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade unique,
  email        text not null,
  frequency    text not null check (frequency in ('daily', 'weekly', 'monthly')),
  account_id   text not null,
  account_name text,
  date_preset  text,
  enabled      boolean not null default true,
  next_send_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ─── RLS (Row Level Security) ─────────────────────────────────────────────────
-- Service_role key bypassa RLS. O app usa service_role no server, então
-- as policies abaixo protegem acesso direto ao Supabase (ex: dashboard UI)
-- mas não afetam as operações do servidor.

alter table user_tokens        enable row level security;
alter table profit_configs     enable row level security;
alter table automation_rules   enable row level security;
alter table scheduled_reports  enable row level security;

-- Políticas: usuário só acessa seus próprios dados
-- (requer auth.uid() mapeado via Supabase JWT — configurar se usar client-side Supabase)
create policy "user_tokens_own"
  on user_tokens for all
  using (user_id = auth.uid());

create policy "profit_configs_own"
  on profit_configs for all
  using (user_id = auth.uid());

create policy "automation_rules_own"
  on automation_rules for all
  using (user_id = auth.uid());

create policy "scheduled_reports_own"
  on scheduled_reports for all
  using (user_id = auth.uid());
