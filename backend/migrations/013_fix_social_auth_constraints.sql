-- Migration 013: Ensure social auth constraints are correct
-- Fixes password/email NOT NULL for Google/Telegram users

DO $$
BEGIN
    -- Allow password to be NULL (for Google/Telegram users)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
        RAISE NOTICE 'Dropped NOT NULL on password';
    END IF;

    -- Allow email to be NULL (for Telegram users)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'email' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
        RAISE NOTICE 'Dropped NOT NULL on email';
    END IF;
END $$;
