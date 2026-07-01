ALTER TABLE leads ADD COLUMN IF NOT EXISTS landing_id UUID REFERENCES landings(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS message TEXT;
CREATE INDEX IF NOT EXISTS idx_leads_landing_id ON leads(landing_id);
GRANT ALL ON leads TO mvira_user;
