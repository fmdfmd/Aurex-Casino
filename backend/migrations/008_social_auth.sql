-- Migration 008: Add social auth columns
-- Google OAuth
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_email VARCHAR(255);

-- Allow password to be NULL for social login users (Google/Telegram)
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;

-- telegram_id already exists, just ensure index
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
