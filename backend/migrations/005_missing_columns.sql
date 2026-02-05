-- Миграция 005: Добавление недостающих колонок

-- ===================== USERS =====================

-- Статистика игрока
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'total_wagered') THEN
        ALTER TABLE users ADD COLUMN total_wagered DECIMAL(15, 2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'games_played') THEN
        ALTER TABLE users ADD COLUMN games_played INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'referral_earnings') THEN
        ALTER TABLE users ADD COLUMN referral_earnings DECIMAL(15, 2) DEFAULT 0;
    END IF;
    
    -- Персональные данные
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'first_name') THEN
        ALTER TABLE users ADD COLUMN first_name VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_name') THEN
        ALTER TABLE users ADD COLUMN last_name VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone') THEN
        ALTER TABLE users ADD COLUMN phone VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'avatar') THEN
        ALTER TABLE users ADD COLUMN avatar TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'date_of_birth') THEN
        ALTER TABLE users ADD COLUMN date_of_birth DATE;
    END IF;
    
    -- Telegram интеграция
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'telegram_id') THEN
        ALTER TABLE users ADD COLUMN telegram_id VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'telegram_username') THEN
        ALTER TABLE users ADD COLUMN telegram_username VARCHAR(100);
    END IF;
END $$;

-- ===================== TRANSACTIONS =====================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'round_id') THEN
        ALTER TABLE transactions ADD COLUMN round_id VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'game_session_id') THEN
        ALTER TABLE transactions ADD COLUMN game_session_id INTEGER REFERENCES game_sessions(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'wallet_address') THEN
        ALTER TABLE transactions ADD COLUMN wallet_address VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'tx_hash') THEN
        ALTER TABLE transactions ADD COLUMN tx_hash VARCHAR(255);
    END IF;
END $$;

-- ===================== GAME_SESSIONS =====================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_sessions' AND column_name = 'game_type') THEN
        ALTER TABLE game_sessions ADD COLUMN game_type VARCHAR(50) DEFAULT 'slots';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_sessions' AND column_name = 'is_demo') THEN
        ALTER TABLE game_sessions ADD COLUMN is_demo BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- ===================== TOURNAMENTS =====================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'type') THEN
        ALTER TABLE tournaments ADD COLUMN type VARCHAR(50) DEFAULT 'daily';
    END IF;
END $$;

-- ===================== ИНДЕКСЫ =====================

CREATE INDEX IF NOT EXISTS idx_users_total_wagered ON users(total_wagered DESC);
CREATE INDEX IF NOT EXISTS idx_users_games_played ON users(games_played DESC);
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_transactions_round_id ON transactions(round_id);
CREATE INDEX IF NOT EXISTS idx_transactions_game_session_id ON transactions(game_session_id);

-- Комментарии
COMMENT ON COLUMN users.total_wagered IS 'Общая сумма ставок пользователя';
COMMENT ON COLUMN users.games_played IS 'Количество сыгранных игр';
COMMENT ON COLUMN users.referral_earnings IS 'Заработок от реферальной программы';
