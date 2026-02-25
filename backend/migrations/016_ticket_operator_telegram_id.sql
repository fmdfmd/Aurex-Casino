ALTER TABLE tickets ADD COLUMN IF NOT EXISTS operator_telegram_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_tickets_operator_telegram_id ON tickets(operator_telegram_id) WHERE operator_telegram_id IS NOT NULL;
