-- Analytics Schema
CREATE TABLE IF NOT EXISTS site_analytics (
    id BIGSERIAL PRIMARY KEY,
    event_type TEXT NOT NULL,
    event_data JSONB,
    visitor_id TEXT,
    url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE site_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can insert analytics" ON site_analytics;
DROP POLICY IF EXISTS "Admin full access analytics" ON site_analytics;

CREATE POLICY "Public can insert analytics"
    ON site_analytics FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Admin full access analytics"
    ON site_analytics FOR ALL TO authenticated USING (true) WITH CHECK (true);
