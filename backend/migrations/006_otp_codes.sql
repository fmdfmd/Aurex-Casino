-- Миграция 006: OTP коды для SMS/Email подтверждения

CREATE TABLE IF NOT EXISTS otp_codes (
  id SERIAL PRIMARY KEY,
  destination VARCHAR(255) NOT NULL, -- phone (11 digits) or email (lowercase)
  channel VARCHAR(20) NOT NULL,      -- sms | email
  purpose VARCHAR(50) NOT NULL,      -- register | login | etc
  code_hash VARCHAR(64) NOT NULL,    -- sha256
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  consumed_at TIMESTAMP,
  ip_address VARCHAR(100),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Only one active OTP per destination/channel/purpose
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'uniq_active_otp_codes_destination_channel_purpose'
  ) THEN
    CREATE UNIQUE INDEX uniq_active_otp_codes_destination_channel_purpose
      ON otp_codes(destination, channel, purpose)
      WHERE consumed_at IS NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_otp_codes_lookup
  ON otp_codes(destination, channel, purpose, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_otp_codes_expires
  ON otp_codes(expires_at);

-- Разрешаем регистрацию без email (только по телефону)
DO $$
BEGIN
  -- Убираем NOT NULL с email
  ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  NULL; -- уже nullable
END $$;

-- Уникальный индекс на phone (если не пустой)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_users_phone_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_users_phone_unique ON users(phone) WHERE phone IS NOT NULL;
  END IF;
END $$;

