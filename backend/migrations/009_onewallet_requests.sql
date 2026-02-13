-- Migration 009: OneWallet idempotency storage
-- Дата: 2026-02-13

CREATE TABLE IF NOT EXISTS onewallet_requests (
  id SERIAL PRIMARY KEY,
  tid TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  userid TEXT NOT NULL,
  currency TEXT NOT NULL,
  amount TEXT,
  i_gameid TEXT,
  i_actionid TEXT,
  subtype TEXT,
  request_json JSONB NOT NULL,
  response_json JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_onewallet_requests_user_created
  ON onewallet_requests (userid, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_onewallet_requests_game_action
  ON onewallet_requests (userid, i_gameid, i_actionid);

