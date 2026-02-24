-- Support managers table for Telegram notifications
CREATE TABLE IF NOT EXISTS support_managers (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username VARCHAR(100),
  first_name VARCHAR(255),
  role VARCHAR(20) DEFAULT 'junior',
  is_active BOOLEAN DEFAULT TRUE,
  is_online BOOLEAN DEFAULT FALSE,
  tickets_handled INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add role column if table already exists from telegram-bot migration
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_managers' AND column_name = 'role') THEN
        ALTER TABLE support_managers ADD COLUMN role VARCHAR(20) DEFAULT 'junior';
    END IF;
END $$;
