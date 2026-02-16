-- Freerounds with wager tracking
CREATE TABLE IF NOT EXISTS freerounds_bonuses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  fundist_tid VARCHAR(64) NOT NULL,          -- TID from Freerounds/Add
  operator VARCHAR(64) NOT NULL,              -- e.g. PragmaticPlay
  game_code VARCHAR(128) NOT NULL,            -- e.g. vs20doghouse
  count INTEGER NOT NULL DEFAULT 0,           -- number of freerounds issued
  bet_level INTEGER DEFAULT 1,
  wager_multiplier NUMERIC(6,2) NOT NULL DEFAULT 0,  -- 0 = no wager, 3 = x3, 30 = x30
  win_amount NUMERIC(14,2) NOT NULL DEFAULT 0,        -- total won from freerounds
  wager_required NUMERIC(14,2) NOT NULL DEFAULT 0,    -- win_amount * wager_multiplier
  wager_completed NUMERIC(14,2) NOT NULL DEFAULT 0,   -- how much player wagered so far
  status VARCHAR(20) NOT NULL DEFAULT 'active',        -- active, wagering, completed, expired, cancelled
  expire_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_freerounds_bonuses_user ON freerounds_bonuses(user_id);
CREATE INDEX IF NOT EXISTS idx_freerounds_bonuses_tid ON freerounds_bonuses(fundist_tid);
CREATE INDEX IF NOT EXISTS idx_freerounds_bonuses_status ON freerounds_bonuses(status);
