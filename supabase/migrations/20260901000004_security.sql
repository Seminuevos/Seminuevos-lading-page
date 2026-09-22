-- =============================================
-- SemiNuevo Agency — Security & Monitoring Schema
-- =============================================
-- Agrega `user_id`, que el código (login/logout/security-log) siempre
-- escribe pero no existía en el schema original.

CREATE TABLE IF NOT EXISTS security_logs (
    id BIGSERIAL PRIMARY KEY,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
    ip_address TEXT,
    details TEXT,
    user_agent TEXT,
    user_id UUID REFERENCES agency_users(id) ON DELETE SET NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migración desde el schema viejo:
--   ALTER TABLE security_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES agency_users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS ip_blacklist (
    ip TEXT PRIMARY KEY,
    reason TEXT,
    blocked_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_blacklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can insert security logs" ON security_logs;
DROP POLICY IF EXISTS "Admin full access security logs" ON security_logs;
DROP POLICY IF EXISTS "Admin full access ip_blacklist" ON ip_blacklist;

CREATE POLICY "Public can insert security logs"
    ON security_logs FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Admin full access security logs"
    ON security_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin full access ip_blacklist"
    ON ip_blacklist FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION get_security_stats()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'critical_events', (SELECT count(*) FROM security_logs WHERE severity = 'critical' AND created_at > NOW() - INTERVAL '24 hours'),
        'total_events_24h', (SELECT count(*) FROM security_logs WHERE created_at > NOW() - INTERVAL '24 hours'),
        'blocked_ips', (SELECT count(*) FROM ip_blacklist WHERE expires_at IS NULL OR expires_at > NOW())
    ) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
