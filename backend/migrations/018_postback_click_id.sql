-- Postback tracking: click_id from affiliate traffic
ALTER TABLE users ADD COLUMN IF NOT EXISTS click_id VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS postback_reg_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS postback_ftd_sent BOOLEAN DEFAULT FALSE;
