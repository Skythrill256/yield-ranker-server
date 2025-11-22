-- ============================================
-- COMPLETE DATABASE SETUP FOR EXCEL UPLOAD
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Create etfs table if it doesn't exist
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

-- Step 2: Add any missing columns (safe - won't error if column exists)
DO $$
BEGIN
  -- Add columns that might be missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'etfs' AND column_name = 'name') THEN
    ALTER TABLE etfs ADD COLUMN name TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'etfs' AND column_name = 'issuer') THEN
    ALTER TABLE etfs ADD COLUMN issuer TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'etfs' AND column_name = 'description') THEN
    ALTER TABLE etfs ADD COLUMN description TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'etfs' AND column_name = 'pay_day') THEN
    ALTER TABLE etfs ADD COLUMN pay_day TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'etfs' AND column_name = 'ipo_price') THEN
    ALTER TABLE etfs ADD COLUMN ipo_price NUMERIC;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'etfs' AND column_name = 'price') THEN
    ALTER TABLE etfs ADD COLUMN price NUMERIC;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'etfs' AND column_name = 'price_change') THEN
    ALTER TABLE etfs ADD COLUMN price_change NUMERIC;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'etfs' AND column_name = 'dividend') THEN
    ALTER TABLE etfs ADD COLUMN dividend NUMERIC;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'etfs' AND column_name = 'payments_per_year') THEN
    ALTER TABLE etfs ADD COLUMN payments_per_year INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'etfs' AND column_name = 'annual_div') THEN
    ALTER TABLE etfs ADD COLUMN annual_div NUMERIC;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'etfs' AND column_name = 'forward_yield') THEN
    ALTER TABLE etfs ADD COLUMN forward_yield NUMERIC;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'etfs' AND column_name = 'dividend_volatility_index') THEN
    ALTER TABLE etfs ADD COLUMN dividend_volatility_index NUMERIC;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'etfs' AND column_name = 'weighted_rank') THEN
    ALTER TABLE etfs ADD COLUMN weighted_rank NUMERIC;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'etfs' AND column_name = 'three_year_annualized') THEN
    ALTER TABLE etfs ADD COLUMN three_year_annualized NUMERIC;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'etfs' AND column_name = 'total_return_12m') THEN
    ALTER TABLE etfs ADD COLUMN total_return_12m NUMERIC;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'etfs' AND column_name = 'total_return_6m') THEN
    ALTER TABLE etfs ADD COLUMN total_return_6m NUMERIC;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'etfs' AND column_name = 'total_return_3m') THEN
    ALTER TABLE etfs ADD COLUMN total_return_3m NUMERIC;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'etfs' AND column_name = 'total_return_1m') THEN
    ALTER TABLE etfs ADD COLUMN total_return_1m NUMERIC;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'etfs' AND column_name = 'total_return_1w') THEN
    ALTER TABLE etfs ADD COLUMN total_return_1w NUMERIC;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'etfs' AND column_name = 'week_52_low') THEN
    ALTER TABLE etfs ADD COLUMN week_52_low NUMERIC;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'etfs' AND column_name = 'week_52_high') THEN
    ALTER TABLE etfs ADD COLUMN week_52_high NUMERIC;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'etfs' AND column_name = 'spreadsheet_updated_at') THEN
    ALTER TABLE etfs ADD COLUMN spreadsheet_updated_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'etfs' AND column_name = 'created_at') THEN
    ALTER TABLE etfs ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'etfs' AND column_name = 'updated_at') THEN
    ALTER TABLE etfs ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_etfs_symbol ON etfs(symbol);
CREATE INDEX IF NOT EXISTS idx_etfs_issuer ON etfs(issuer);
CREATE INDEX IF NOT EXISTS idx_etfs_forward_yield ON etfs(forward_yield);
CREATE INDEX IF NOT EXISTS idx_etfs_total_return_12m ON etfs(total_return_12m);
CREATE INDEX IF NOT EXISTS idx_etfs_updated_at ON etfs(spreadsheet_updated_at);

-- Step 4: Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger (drop first if exists to avoid errors)
DROP TRIGGER IF EXISTS update_etfs_updated_at ON etfs;
CREATE TRIGGER update_etfs_updated_at
BEFORE UPDATE ON etfs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Step 6: Set up RLS (Row Level Security) policies
-- Enable RLS on the table
ALTER TABLE etfs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access" ON etfs;
DROP POLICY IF EXISTS "Allow service role full access" ON etfs;
DROP POLICY IF EXISTS "Allow anonymous read access" ON etfs;

-- Policy 1: Allow anyone to read (for public API)
CREATE POLICY "Allow public read access"
ON etfs FOR SELECT
TO public
USING (true);

-- Policy 2: Allow service role to do everything (for backend uploads)
CREATE POLICY "Allow service role full access"
ON etfs FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy 3: Allow anonymous to read (for unauthenticated users)
CREATE POLICY "Allow anonymous read access"
ON etfs FOR SELECT
TO anon
USING (true);

-- Step 7: Grant necessary permissions
GRANT SELECT ON etfs TO anon;
GRANT SELECT ON etfs TO authenticated;
GRANT ALL ON etfs TO service_role;

-- Step 8: Verify table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'etfs'
ORDER BY ordinal_position;

-- Step 9: Check current row count
SELECT COUNT(*) as total_etfs FROM etfs;

-- Step 10: Verify indexes exist
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'etfs';

-- ============================================
-- VERIFICATION QUERIES (Run separately)
-- ============================================

-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'etfs'
);

-- Check all columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'etfs'
ORDER BY ordinal_position;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'etfs';

-- Check policies
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'etfs';

-- Test insert (should work with service_role)
-- This will fail if RLS is blocking, which means policies need fixing
-- INSERT INTO etfs (symbol) VALUES ('TEST') ON CONFLICT (symbol) DO NOTHING;
-- DELETE FROM etfs WHERE symbol = 'TEST';

