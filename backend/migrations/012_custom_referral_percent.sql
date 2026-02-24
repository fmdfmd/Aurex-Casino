-- Custom referral commission percent per user (for bloggers/streamers)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'custom_referral_percent') THEN
        ALTER TABLE users ADD COLUMN custom_referral_percent DECIMAL(5, 2) DEFAULT NULL;
    END IF;
END $$;

COMMENT ON COLUMN users.custom_referral_percent IS 'Individual referral commission % (overrides tier). NULL = use tier default.';
