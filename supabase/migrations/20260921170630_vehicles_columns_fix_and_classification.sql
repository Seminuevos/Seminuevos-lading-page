-- =============================================
-- SemiNuevo Agency — vehicles: fix de drift + clasificación + concesionario
-- =============================================
-- `color` está en 20260901000001_vehicles.sql desde el CREATE TABLE original pero
-- nunca se aplicó de verdad contra producción (confirmado vía API REST:
-- "column vehicles.color does not exist") — vehicles.service.ts ya lo
-- selecciona en PUBLIC_COLUMNS, así que hoy /api/public/vehicles responde
-- 400. Este ADD COLUMN lo resuelve.

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS color TEXT;

-- Clasificación de la razón de negocio del vehículo. No son mutuamente
-- excluyentes (mismo criterio que trade_in_eligible/financing_eligible/
-- has_title en 20260918184518_vehicle_labels.sql): un vehículo puede ser
-- para compra Y para importación a la vez, por ejemplo.
--
-- NO se agrega una columna nueva para "alquiler": `available_for_rental`
-- (20260918184518_vehicle_labels.sql) ya significa exactamente eso — un
-- vehículo en venta que también se puede alquilar. Agregar otra columna acá
-- sería un duplicado.
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS for_sale BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS for_import BOOLEAN NOT NULL DEFAULT false;

-- Concesionario dueño del vehículo (nullable: inventario propio de la
-- agencia no tiene concesionario asignado).
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS concesionario_id BIGINT
    REFERENCES concesionarios(id) ON DELETE SET NULL;
