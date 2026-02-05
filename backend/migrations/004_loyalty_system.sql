-- Миграция 004: Система лояльности (VIP очки + магазин)

-- Таблица покупок в магазине лояльности
CREATE TABLE IF NOT EXISTS loyalty_purchases (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    item_id VARCHAR(50) NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    points_spent INTEGER NOT NULL DEFAULT 0,
    item_type VARCHAR(50) NOT NULL,
    item_value INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица активных бустов пользователей
CREATE TABLE IF NOT EXISTS user_boosts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    boost_type VARCHAR(50) NOT NULL,
    boost_value INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Добавляем колонку freespins в users если нет
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'freespins') THEN
        ALTER TABLE users ADD COLUMN freespins INTEGER DEFAULT 0;
    END IF;
END $$;

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_loyalty_purchases_user_id ON loyalty_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_purchases_created_at ON loyalty_purchases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_boosts_user_id ON user_boosts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_boosts_expires_at ON user_boosts(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_boosts_active ON user_boosts(user_id, is_active) WHERE is_active = TRUE;

-- Таблица admin_actions если нет
CREATE TABLE IF NOT EXISTS admin_actions (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    target_user_id INTEGER REFERENCES users(id),
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at DESC);

-- Комментарии
COMMENT ON TABLE loyalty_purchases IS 'История покупок в магазине VIP очков';
COMMENT ON TABLE user_boosts IS 'Активные бусты пользователей (кэшбэк+, очки x2 и т.д.)';
COMMENT ON TABLE admin_actions IS 'Лог действий администраторов';
