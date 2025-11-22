-- Run this script ONLY if you already have an etfs table and need to add missing columns
-- If you're setting up for the first time, use SUPABASE_ETF_TABLE.sql instead

ALTER TABLE etfs ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE etfs ADD COLUMN IF NOT EXISTS week_52_low NUMERIC;
ALTER TABLE etfs ADD COLUMN IF NOT EXISTS week_52_high NUMERIC;

CREATE INDEX IF NOT EXISTS idx_etfs_forward_yield ON etfs(forward_yield);
CREATE INDEX IF NOT EXISTS idx_etfs_total_return_12m ON etfs(total_return_12m);

-- Verify all columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'etfs' 
ORDER BY ordinal_position;





