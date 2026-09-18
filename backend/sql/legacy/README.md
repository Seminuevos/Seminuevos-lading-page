# Scripts legacy (datos reales, no solo schema)

Estos 3 archivos no son parte del schema consolidado (`../001_*.sql` a
`../007_*.sql`) — son scripts de datos/migraciones puntuales del sitio
anterior, movidos aquí tal cual (sin editar) porque tienen valor real:

- **`insert-vehicles.sql`**: seed real del inventario de vehículos (generado
  en su momento desde `data.js`), incluye las rutas de `images/gallery/...`.
  Útil para poblar un proyecto Supabase nuevo desde cero.
- **`alter-vehicles-mastertech.sql`**: agrega la columna `mastertech` —
  ya incluida en `../001_vehicles.sql`, se deja aquí solo como referencia
  histórica.
- **`update-catalogs.sql`**: corrección puntual de datos (mueve vehículos
  mal catalogados de `0km` a `importados`). Solo aplícalo si tu base de
  datos tiene ese mismo problema de datos.
