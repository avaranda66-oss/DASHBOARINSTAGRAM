-- ─── 002_allowed_users.sql ────────────────────────────────────────────────────
-- Tabela de usuários permitidos para acesso privado ao dashboard.
-- Apenas emails cadastrados aqui podem fazer login com email+senha.
-- ──────────────────────────────────────────────────────────────────────────────

create table if not exists allowed_users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  password_hash text not null,            -- bcrypt hash
  name          text not null,
  role          text not null default 'user',  -- 'admin' | 'user'
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Apenas service_role pode acessar (segurança total)
alter table allowed_users enable row level security;
-- Sem policies públicas — somente via service_role (server-side)
