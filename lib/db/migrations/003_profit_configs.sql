-- Migration 003: profit_configs + automation_rules
-- Usa user_identifier (text) como chave — suporta Meta userId e email Credentials

CREATE TABLE IF NOT EXISTS profit_configs (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_identifier text        UNIQUE NOT NULL,
    config          jsonb       NOT NULL DEFAULT '{}',
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

ALTER TABLE profit_configs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS automation_rules (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_identifier text        NOT NULL,
    rule            jsonb       NOT NULL,
    created_at      timestamptz DEFAULT now()
);

ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;

-- Index para lookup por user_identifier
CREATE INDEX IF NOT EXISTS automation_rules_user_idx
    ON automation_rules (user_identifier);
