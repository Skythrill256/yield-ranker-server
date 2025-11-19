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

CREATE INDEX IF NOT EXISTS idx_etfs_symbol ON etfs(symbol);
CREATE INDEX IF NOT EXISTS idx_etfs_issuer ON etfs(issuer);
CREATE INDEX IF NOT EXISTS idx_etfs_forward_yield ON etfs(forward_yield);
CREATE INDEX IF NOT EXISTS idx_etfs_total_return_12m ON etfs(total_return_12m);
CREATE INDEX IF NOT EXISTS idx_etfs_updated_at ON etfs(spreadsheet_updated_at);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_etfs_updated_at
BEFORE UPDATE ON etfs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

