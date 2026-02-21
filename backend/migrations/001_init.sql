-- AUREX Casino Database Schema for PostgreSQL

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  odid VARCHAR(50) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  balance DECIMAL(15, 2) DEFAULT 0,
  bonus_balance DECIMAL(15, 2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'RUB',
  vip_level INTEGER DEFAULT 1,
  vip_points INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  b2b_user_id VARCHAR(100),
  referral_code VARCHAR(50) UNIQUE,
  referred_by VARCHAR(50),
  deposit_count INTEGER DEFAULT 0,
  used_bonuses JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- deposit, withdrawal, bet, win, bonus, referral
  amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'RUB',
  status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed, cancelled
  payment_method VARCHAR(100),
  payment_details JSONB,
  description TEXT,
  ip_address VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bonuses table
CREATE TABLE IF NOT EXISTS bonuses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  bonus_type VARCHAR(100) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  wagering_requirement DECIMAL(15, 2) DEFAULT 0,
  wagering_completed DECIMAL(15, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active', -- active, completed, expired, cancelled
  expires_at TIMESTAMP,
  activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Game sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  game_id VARCHAR(100) NOT NULL,
  game_name VARCHAR(255),
  provider VARCHAR(100),
  bet_amount DECIMAL(15, 2) NOT NULL,
  win_amount DECIMAL(15, 2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'RUB',
  session_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP
);

-- Jackpot winners table
CREATE TABLE IF NOT EXISTS jackpot_winners (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  username VARCHAR(100),
  jackpot_id VARCHAR(50) NOT NULL,
  jackpot_name VARCHAR(100),
  amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'RUB',
  game_id VARCHAR(100),
  won_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  prize_pool DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'RUB',
  min_bet DECIMAL(15, 2) DEFAULT 10,
  status VARCHAR(50) DEFAULT 'upcoming', -- upcoming, active, completed, cancelled
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  game_ids TEXT[], -- array of game IDs
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tournament participants table
CREATE TABLE IF NOT EXISTS tournament_participants (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER DEFAULT 0,
  total_wagered DECIMAL(15, 2) DEFAULT 0,
  rank INTEGER,
  prize_won DECIMAL(15, 2),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tournament_id, user_id)
);

-- Tickets/Support table
CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'open', -- open, in_progress, resolved, closed
  priority VARCHAR(50) DEFAULT 'medium', -- low, medium, high, urgent
  category VARCHAR(100),
  assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ticket messages table
CREATE TABLE IF NOT EXISTS ticket_messages (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_staff BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Site settings table
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  category VARCHAR(100),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Promocodes table
CREATE TABLE IF NOT EXISTS promocodes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL, -- deposit_bonus, freespins, bonus, cashback
  value DECIMAL(15, 2) NOT NULL,
  value_type VARCHAR(20) DEFAULT 'percent', -- percent, fixed
  max_bonus DECIMAL(15, 2),
  min_deposit DECIMAL(15, 2),
  wager INTEGER DEFAULT 35,
  usage_limit INTEGER DEFAULT 1000,
  used_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Promocode usages table
CREATE TABLE IF NOT EXISTS promocode_usages (
  id SERIAL PRIMARY KEY,
  promocode_id INTEGER REFERENCES promocodes(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(promocode_id, user_id)
);

-- Verifications table
CREATE TABLE IF NOT EXISTS verifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
  level INTEGER DEFAULT 0,
  documents JSONB DEFAULT '{}',
  personal_info JSONB DEFAULT '{}',
  rejection_reason TEXT,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Vault bonuses table
CREATE TABLE IF NOT EXISTS vault_bonuses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- freespins, cashback, reload, birthday, vip, special
  name VARCHAR(255) NOT NULL,
  description TEXT,
  value VARCHAR(100),
  value_amount DECIMAL(15, 2),
  icon VARCHAR(50),
  gradient VARCHAR(100),
  expires_at TIMESTAMP,
  is_locked BOOLEAN DEFAULT FALSE,
  unlock_condition TEXT,
  wager_required INTEGER DEFAULT 0,
  wager_completed INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'available', -- available, activated, used, expired
  activated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cashback records
CREATE TABLE IF NOT EXISTS cashback_records (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL,
  period VARCHAR(50), -- daily, weekly, monthly
  wager_required DECIMAL(15, 2) DEFAULT 0,
  wager_completed DECIMAL(15, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending', -- pending, claimed, expired
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  claimed_at TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_odid ON users(odid);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_bonuses_user_id ON bonuses(user_id);
CREATE INDEX IF NOT EXISTS idx_bonuses_status ON bonuses(status);
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_jackpot_winners_jackpot_id ON jackpot_winners(jackpot_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament_id ON tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_user_id ON tournament_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
