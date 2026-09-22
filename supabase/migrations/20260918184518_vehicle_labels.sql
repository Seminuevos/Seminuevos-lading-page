-- ============================================================
-- Migración: 2026-09-18_05 — vehicle_labels
-- Agrega a `vehicles` (catálogo de venta) las etiquetas pedidas:
--   - trade_in_eligible: el modelo admite Trade-In (Programa de Retoma)
--   - financing_eligible: el modelo admite financiamiento
--   - has_title: tiene placa/título (cambia el formato de precio a "+ seguro")
--   - available_for_rental: además de estar en venta, también se puede
--     alquilar — un mismo vehículo puede llevar esta etiqueta junto con
--     su catalog normal (seminuevos/importados/0km), no son excluyentes.
-- Todas boolean, default false — aditivo, no rompe filas existentes.
-- ============================================================

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS trade_in_eligible BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS financing_eligible BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS has_title BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS available_for_rental BOOLEAN NOT NULL DEFAULT false;
