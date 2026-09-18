# Esquema de base de datos — SemiNuevo Agency

Estos archivos reemplazan a los `.sql` sueltos en la raíz del repo. Aplican en orden
(`001` → `007`) sobre un proyecto Supabase nuevo o existente; todos usan
`IF NOT EXISTS` / `DROP POLICY IF EXISTS` por lo que son seguros de re-ejecutar.

## Qué se corrigió respecto a los `.sql` originales

1. **`inquiries` no coincidía con el código.** El schema original definía la columna
   `name`, pero tanto el backend legacy (`api/inquiries/index.js`) como el nuevo
   backend NestJS insertan `full_name`. También faltaban `source` e `ip_address`,
   que el código sí escribe. → `003_inquiries.sql` define las columnas reales que
   usa la aplicación y actualiza el trigger de `crm-schema.sql` que sincroniza
   `site_leads` (usaba `NEW.name`, quedaba siempre en `NULL`).

2. **`security_logs` no tenía la columna `user_id`.** El login, logout y el logger
   de seguridad del código siempre la usan. → agregada en `004_security.sql`.

3. **La tabla `settings` no existía en ningún `.sql`.** `api/settings/index.js` (y
   ahora `SettingsModule`) leen/escriben `settings`, pero solo existía
   `site_settings` (una tabla genérica key/value con otro propósito: textos
   públicos del sitio). Son dos tablas distintas con nombres casi idénticos —
   fuente de bugs. → `005_settings.sql` crea la tabla `settings` real (una sola
   fila de configuración de la agencia).

4. **`agency_users.password` en texto plano + directorio JSON paralelo en
   `site_settings.value` (`agency_users_directory`).** El backend legacy guardaba
   usuarios completos, incluida la contraseña en texto plano, dentro de un blob
   JSON como mecanismo de respaldo. El nuevo backend usa **únicamente**
   `agency_users.password_hash` (bcrypt) como fuente de verdad. →
   `002_agency_users.sql` ya no siembra ninguna contraseña (ni siquiera hasheada)
   por SQL; el primer usuario admin se crea con la API (`POST /api/users`) o a
   mano con bcrypt, nunca commiteado en un archivo.

5. **Backdoor de login eliminado.** El código legacy aceptaba una lista fija de
   "contraseñas maestras" para un email hardcodeado. Esto **no existe** en el
   nuevo backend: `AuthService.login` solo verifica `bcrypt.compare` contra
   `password_hash`.

## ⚠️ Acción pendiente para el usuario

Las credenciales que estaban hardcodeadas en `api/_lib/supabase-server.js`,
`api/auth/login.js` y `users-schema.sql` (contraseña maestra, JWT secret por
defecto) ya están en el historial de git. Rotar en el dashboard de Supabase:

- Password de la cuenta `jvaask16@gmail.com`.
- `service_role key` del proyecto (Settings → API → regenerar).
- Cualquier usuario de `agency_users` cuya contraseña coincida con alguna de las
  "master passwords" hardcodeadas (`MasterAdmin2026!`, `Admin2026!`, `12345678`,
  etc.) — forzar cambio de contraseña.

## Orden de aplicación

| Archivo | Contenido |
|---|---|
| `001_vehicles.sql` | Tabla `vehicles`, RLS, trigger `updated_at`, storage bucket de imágenes |
| `002_agency_users.sql` | Staff/usuarios del panel (`agency_users`), sin passwords en SQL |
| `003_inquiries.sql` | Leads del formulario de contacto + `site_leads` (CRM), columnas alineadas con el código |
| `004_security.sql` | `security_logs` (con `user_id`), `ip_blacklist`, `get_security_stats()` |
| `005_settings.sql` | Tabla `settings` (config de agencia) + `site_settings` (key/value público) |
| `006_analytics.sql` | `site_analytics` |
| `007_promotions.sql` | `promotions` |
