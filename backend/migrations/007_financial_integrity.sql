-- Migration 007: Financial Integrity & Schema Fixes
-- Дата: 2026-01-11
-- Критические исправления для продакшена казино

-- ===== 1. CHECK CONSTRAINTS на баланс (защита от минуса) =====
DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_balance_non_negative CHECK (balance >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_bonus_balance_non_negative CHECK (bonus_balance >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===== 2. NOT NULL на balance и bonus_balance =====
ALTER TABLE users ALTER COLUMN balance SET NOT NULL;
ALTER TABLE users ALTER COLUMN balance SET DEFAULT 0;
ALTER TABLE users ALTER COLUMN bonus_balance SET NOT NULL;
ALTER TABLE users ALTER COLUMN bonus_balance SET DEFAULT 0;

-- ===== 3. Недостающие индексы на FK-колонках =====
CREATE INDEX IF NOT EXISTS idx_jackpot_winners_user_id ON jackpot_winners(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_verifications_reviewed_by ON verifications(reviewed_by);

-- ===== 4. Составной индекс для быстрой истории транзакций =====
CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON transactions(user_id, created_at DESC);

-- ===== 5. Таблица games (если не существует) =====
CREATE TABLE IF NOT EXISTS games (
  id SERIAL PRIMARY KEY,
  game_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  provider VARCHAR(100),
  category VARCHAR(50),
  image_url TEXT,
  rtp DECIMAL(5,2),
  is_active BOOLEAN DEFAULT TRUE,
  is_new BOOLEAN DEFAULT FALSE,
  is_hot BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_games_provider ON games(provider);
CREATE INDEX IF NOT EXISTS idx_games_category ON games(category);

-- ===== 6. Fix telegram_id type conflict (BIGINT is correct) =====
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'telegram_id' AND data_type = 'character varying'
  ) THEN
    ALTER TABLE users ALTER COLUMN telegram_id TYPE BIGINT USING telegram_id::bigint;
  END IF;
END $$;

-- ===== 7. Добавляем недостающие колонки для formatUser =====
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(100);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS total_deposited DECIMAL(15,2) NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS total_withdrawn DECIMAL(15,2) NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS games_played INTEGER NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS total_wagered DECIMAL(15,2) NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
