# Migraciones fechadas

A diferencia de `backend/sql/001_*.sql` a `007_*.sql` (el schema base,
pensado para poblar un proyecto Supabase desde cero), esta carpeta guarda
**migraciones incrementales**, fechadas, para features agregadas después del
schema base. Cada archivo es idempotente (`IF NOT EXISTS`) — se puede
re-ejecutar sin romper nada.

Aplícalas **en orden**, una por una, en el SQL Editor de Supabase. Probar
después de cada una (por eso están separadas por tabla en vez de un solo
archivo gigante):

| Fecha | Archivo | Qué agrega |
|---|---|---|
| 2026-09-18 | `2026-09-18_01_rental_vehicles.sql` | Tabla de vehículos disponibles para alquiler |
| 2026-09-18 | `2026-09-18_02_rental_price_rules.sql` | Tarifas por rango de fechas para cada vehículo de alquiler |
| 2026-09-18 | `2026-09-18_03_rental_customers.sql` | Clientes de alquiler (solo email + teléfono, sin cuenta) |
| 2026-09-18 | `2026-09-18_04_rental_requests.sql` | Solicitudes de alquiler (cliente ⟷ vehículo, con estado) |
| 2026-09-18 | `2026-09-18_05_vehicle_labels.sql` | Etiquetas en `vehicles`: trade_in_eligible, financing_eligible, has_title, available_for_rental |

## Cómo probar cada una

1. Corre el archivo en el SQL Editor.
2. `select * from <tabla>;` — debería devolver 0 filas sin error.
3. Sigue con el siguiente archivo.

Después de las 4, el backend (`RentalsModule`) ya puede leer/escribir contra
este esquema — no hace falta reiniciar nada más que el backend si ya estaba
corriendo con las credenciales reales.
