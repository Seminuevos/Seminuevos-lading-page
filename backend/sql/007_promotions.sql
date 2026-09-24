-- SemiNuevo Agency — Promotions
CREATE TABLE IF NOT EXISTS promotions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    subtitle text,
    description text,
    badge_text text DEFAULT 'OFERTA',
    discount_text text,
    cta_text text DEFAULT 'Ver Oferta',
    cta_url text,
    image_url text,
    bg_color text DEFAULT '#275CEA',
    is_featured boolean DEFAULT false,
    status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    expires_at timestamptz,
    sort_order int DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read promotions" ON promotions;
DROP POLICY IF EXISTS "Admin all promotions" ON promotions;

CREATE POLICY "Public read promotions" ON promotions FOR SELECT USING (status = 'active');
CREATE POLICY "Admin all promotions" ON promotions FOR ALL TO authenticated USING (true) WITH CHECK (true);
