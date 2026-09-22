-- =============================================
-- SemiNuevo Agency — Rol 'concesionario' en agency_users
-- =============================================
-- Un usuario con role='concesionario' pertenece a un único concesionario
-- (concesionario_id obligatorio para ese rol) y solo puede ver/editar los
-- vehículos y consultas de ese concesionario — scoping aplicado en el
-- backend (vehicles.service.ts / vehicle-inquiries.service.ts), no en RLS.

ALTER TABLE agency_users DROP CONSTRAINT IF EXISTS agency_users_role_check;
ALTER TABLE agency_users ADD CONSTRAINT agency_users_role_check
    CHECK (role IN ('admin', 'super_admin', 'sales', 'credit', 'mechanic', 'concesionario'));

ALTER TABLE agency_users ADD COLUMN IF NOT EXISTS concesionario_id BIGINT
    REFERENCES concesionarios(id) ON DELETE SET NULL;

ALTER TABLE agency_users DROP CONSTRAINT IF EXISTS agency_users_concesionario_role_check;
ALTER TABLE agency_users ADD CONSTRAINT agency_users_concesionario_role_check
    CHECK (role <> 'concesionario' OR concesionario_id IS NOT NULL);
