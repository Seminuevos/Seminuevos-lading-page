# Migraciones con Supabase CLI

Este proyecto usa el [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)
para versionar y aplicar cambios de esquema, en vez de pegar SQL a mano en el dashboard.

`supabase/migrations/*.sql` es la fuente de verdad ahora.

No hace falta Docker para nada de esto — `link`, `migration repair` y `db push` hablan
directo con el Postgres del proyecto hosteado. Docker solo hace falta si en algún momento
quieres correr el stack completo en local con `supabase start` (Studio, Auth, etc.), que
este repo no usa.

## ⚠️ Auditoría (2026-09-21): la mitad de las migraciones nunca se aplicaron

Se verificó en vivo contra la API REST del proyecto real (`gfvmugsbizmvlziljxir`) cuáles
migraciones ya están aplicadas y cuáles no — **no asumas que todo lo que hay en
`supabase/migrations/` ya corrió contra producción**. Estado real:

| Migración | Estado en producción |
|---|---|
| `20260901000001_vehicles.sql` | Aplicada, salvo la columna `color` |
| `20260901000002_agency_users.sql` | Aplicada, coincide |
| `20260901000003_inquiries.sql` | Solo `site_leads` está aplicada. La tabla `inquiries` real usa `name`/`service`/`status` (con `'new'`) — el archivo ya fue corregido para documentar esto correctamente. |
| `20260901000004_security.sql` | Aplicada, coincide |
| `20260901000005_settings.sql` | Aplicada, coincide |
| `20260901000006_analytics.sql` | Aplicada, coincide |
| `20260901000007_promotions.sql` | **NO aplicada** (tabla no existe, ningún código la usa) |
| `20260918173427-30_rental_*.sql` (4 archivos) | **NO aplicadas** — `rental_vehicles`, `rental_price_rules`, `rental_customers`, `rental_requests` no existen. Todo `backend/src/rentals/` corre hoy contra tablas inexistentes. |
| `20260918184518_vehicle_labels.sql` | **NO aplicada** — `trade_in_eligible`, `financing_eligible`, `has_title`, `available_for_rental` no existen |
| `20260921170628_concesionarios.sql` | Nueva, no aplicada |
| `20260921170629_agency_users_concesionario_role.sql` | Nueva, no aplicada |
| `20260921170630_vehicles_columns_fix_and_classification.sql` | Nueva, no aplicada |
| `20260921170631_vehicle_inquiries.sql` | Nueva, no aplicada |

**Consecuencia activa:** `vehicles.service.ts` selecciona columnas que no existen
(`color`, las 4 de vehicle_labels) → `GET /api/public/vehicles` devuelve HTTP 400 en
producción ahora mismo. Ver `backend/src/vehicles/vehicles.service.ts` — la migración
`20260921170630` agrega `color` de vuelta, lo que arregla esto en cuanto se aplique.

## Setup inicial (una vez por máquina)

1. **Login** — genera un access token en
   https://supabase.com/dashboard/account/tokens y luego:
   ```bash
   npx supabase login
   ```
   (o `SUPABASE_ACCESS_TOKEN=<token>` como variable de entorno si preferís no pasar por el
   flujo interactivo).

2. **Link al proyecto** — pide el ref (`gfvmugsbizmvlziljxir`, el subdominio de
   `SUPABASE_URL`) y la contraseña de la base de datos (Settings → Database en el
   dashboard de Supabase, **no** es el `service_role key`):
   ```bash
   npx supabase link --project-ref gfvmugsbizmvlziljxir
   ```

3. **Adoptar SOLO lo que ya está aplicado de verdad** — marcar como aplicadas en la tabla
   de control del CLI (`supabase_migrations.schema_migrations`) sin re-ejecutarlas, porque
   ya existen con datos reales:
   ```bash
   npx supabase migration repair --status applied \
     20260901000001 20260901000002 20260901000003 \
     20260901000004 20260901000005 20260901000006
   ```
   Estas 6 son las únicas confirmadas como ya aplicadas (ver tabla arriba).

4. **Dejar que `db push` ejecute de verdad el resto** — porque nunca corrieron contra
   producción y hoy causan errores en runtime:
   ```bash
   npx supabase db push
   ```
   Esto aplica, en orden: `20260901000007` (promotions), las 4 de rentals,
   `20260918184518` (vehicle_labels), y las 4 nuevas de concesionarios/clasificación/
   vehicle_inquiries. Todas usan `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`, así que son
   seguras de ejecutar contra una base con datos reales — solo crean lo que falta.

5. Confirmá con `npx supabase migration list` que el estado local/remoto coincide antes
   de dar por cerrada la adopción. Después de esto, `GET /api/public/vehicles` debería
   dejar de devolver 400.

## Flujo normal de ahí en adelante

```bash
npx supabase migration new agregar_columna_x   # crea supabase/migrations/<ts>_agregar_columna_x.sql
# editar el archivo generado con el SQL del cambio
npx supabase db push                            # lo aplica contra el proyecto linkeado
```

`db push` corre solo las migraciones nuevas (las que no estén ya en
`schema_migrations`), en orden, contra la base remota — ya no hay que copiar/pegar nada
en el SQL Editor del dashboard.

Para ver diferencias entre el esquema remoto y las migraciones locales:
```bash
npx supabase db diff --linked
```
