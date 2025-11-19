CREATE TABLE IF NOT EXISTS site_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_type TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO site_messages (message_type, content, is_active) VALUES
  ('admin_message', 'Welcome to Yield Ranker', true),
  ('disclosure', 'This website is for informational purposes only. Past performance does not guarantee future results. Please consult with a financial advisor before making investment decisions.', true)
ON CONFLICT (message_type) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_site_messages_type ON site_messages(message_type);

CREATE OR REPLACE FUNCTION update_site_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_site_messages_updated_at
BEFORE UPDATE ON site_messages
FOR EACH ROW
EXECUTE FUNCTION update_site_messages_updated_at();

