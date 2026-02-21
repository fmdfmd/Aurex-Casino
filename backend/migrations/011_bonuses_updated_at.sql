-- Migration 011: Add updated_at column to bonuses table (required by wager tracking)

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bonuses' AND column_name = 'updated_at') THEN
        ALTER TABLE bonuses ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;
