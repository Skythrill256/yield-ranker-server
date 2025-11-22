-- ============================================
-- QUICK FIX FOR EXCEL UPLOAD
-- Run this in Supabase SQL Editor if upload is failing
-- ============================================

-- Step 1: Ensure table exists with all columns
CREATE TABLE IF NOT EXISTS etfs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT UNIQUE NOT NULL,
  name TEXT,
  issuer TEXT,
  description TEXT,
  pay_day TEXT,
  ipo_price NUMERIC,
  price NUMERIC,
  price_change NUMERIC,
  dividend NUMERIC,
  payments_per_year INTEGER,
  annual_div NUMERIC,
  forward_yield NUMERIC,
  dividend_volatility_index NUMERIC,
  weighted_rank NUMERIC,
  three_year_annualized NUMERIC,
  total_return_12m NUMERIC,
  total_return_6m NUMERIC,
  total_return_3m NUMERIC,
  total_return_1m NUMERIC,
  total_return_1w NUMERIC,
  week_52_low NUMERIC,
  week_52_high NUMERIC,
  spreadsheet_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Add missing columns (safe - won't error if exists)
ALTER TABLE etfs ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE etfs ADD COLUMN IF NOT EXISTS issuer TEXT;
ALTER TABLE etfs ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE etfs ADD COLUMN IF NOT EXISTS pay_day TEXT;
ALTER TABLE etfs ADD COLUMN IF NOT EXISTS ipo_price NUMERIC;
ALTER TABLE etfs ADD COLUMN IF NOT EXISTS price NUMERIC;
ALTER TABLE etfs ADD COLUMN IF NOT EXISTS price_change NUMERIC;
ALTER TABLE etfs ADD COLUMN IF NOT EXISTS dividend NUMERIC;
ALTER TABLE etfs ADD COLUMN IF NOT EXISTS payments_per_year INTEGER;
ALTER TABLE etfs ADD COLUMN IF NOT EXISTS annual_div NUMERIC;
ALTER TABLE etfs ADD COLUMN IF NOT EXISTS forward_yield NUMERIC;
ALTER TABLE etfs ADD COLUMN IF NOT EXISTS dividend_volatility_index NUMERIC;
ALTER TABLE etfs ADD COLUMN IF NOT EXISTS weighted_rank NUMERIC;
ALTER TABLE etfs ADD COLUMN IF NOT EXISTS three_year_annualized NUMERIC;
ALTER TABLE etfs ADD COLUMN IF NOT EXISTS total_return_12m NUMERIC;
ALTER TABLE etfs ADD COLUMN IF NOT EXISTS total_return_6m NUMERIC;
ALTER TABLE etfs ADD COLUMN IF NOT EXISTS total_return_3m NUMERIC;
ALTER TABLE etfs ADD COLUMN IF NOT EXISTS total_return_1m NUMERIC;
ALTER TABLE etfs ADD COLUMN IF NOT EXISTS total_return_1w NUMERIC;
ALTER TABLE etfs ADD COLUMN IF NOT EXISTS week_52_low NUMERIC;
ALTER TABLE etfs ADD COLUMN IF NOT EXISTS week_52_high NUMERIC;
ALTER TABLE etfs ADD COLUMN IF NOT EXISTS spreadsheet_updated_at TIMESTAMPTZ;
ALTER TABLE etfs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE etfs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_etfs_symbol ON etfs(symbol);
CREATE INDEX IF NOT EXISTS idx_etfs_issuer ON etfs(issuer);
CREATE INDEX IF NOT EXISTS idx_etfs_forward_yield ON etfs(forward_yield);
CREATE INDEX IF NOT EXISTS idx_etfs_total_return_12m ON etfs(total_return_12m);
CREATE INDEX IF NOT EXISTS idx_etfs_updated_at ON etfs(spreadsheet_updated_at);

-- Step 4: Fix RLS policies (most common issue)
ALTER TABLE etfs ENABLE ROW LEVEL SECURITY;

-- Remove old policies
DROP POLICY IF EXISTS "Allow public read access" ON etfs;
DROP POLICY IF EXISTS "Allow service role full access" ON etfs;
DROP POLICY IF EXISTS "Allow anonymous read access" ON etfs;
DROP POLICY IF EXISTS "Public read access" ON etfs;
DROP POLICY IF EXISTS "Service role full access" ON etfs;

-- Create new policies
CREATE POLICY "Allow public read access"
ON etfs FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow service role full access"
ON etfs FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow anonymous read access"
ON etfs FOR SELECT
TO anon
USING (true);

-- Step 5: Grant permissions
GRANT SELECT ON etfs TO anon;
GRANT SELECT ON etfs TO authenticated;
GRANT ALL ON etfs TO service_role;

-- Step 6: Verify it worked
SELECT 
  'Table exists' as check_item,
  EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'etfs') as result
UNION ALL
SELECT 
  'RLS enabled',
  rowsecurity::text
FROM pg_tables 
WHERE tablename = 'etfs'
UNION ALL
SELECT 
  'Policies exist',
  (SELECT COUNT(*)::text FROM pg_policies WHERE tablename = 'etfs')
UNION ALL
SELECT 
  'Total ETFs',
  COUNT(*)::text
FROM etfs;

