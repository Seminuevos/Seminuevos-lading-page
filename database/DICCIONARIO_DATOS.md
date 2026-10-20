# Diccionario de Datos — Seminuevos Autos

Sistema de base de datos relacional para la plataforma comercial de vehículos **Seminuevos Autos** (Margarita, Venezuela). Compatible con **SQLite 3** local y **PostgreSQL / Supabase** en la nube.

---

## 1. Tabla `vehicles` (Catálogo e Inventario de Vehículos)

Almacena todos los vehículos comercializados por la agencia, tanto en stock físico de entrega inmediata en Porlamar como por pedido e importación directa desde remates y subastas en USA.

| Columna | Tipo SQLite | Tipo Postgres | Restricciones | Descripción |
|---|---|---|---|---|
| `id` | `INTEGER` | `BIGSERIAL` | PRIMARY KEY | Identificador único del vehículo |
| `title` | `TEXT` | `TEXT` | NOT NULL | Marca, modelo, versión y año comercial |
| `price` | `TEXT` | `TEXT` | NOT NULL | Precio de venta en USD o estado (ej. `$36,000`, `Consultar`, `$29,980+`) |
| `year` | `INTEGER` | `INTEGER` | NOT NULL | Año del modelo del vehículo |
| `km` | `TEXT` | `TEXT` | DEFAULT '0 KM' | Kilometraje recorrido (ej. `15,000 KM`, `0 KM`) |
| `engine` | `TEXT` | `TEXT` | - | Especificaciones del motor (ej. `2.0L Turbo`, `3.6L V6`, `5.3L V8`) |
| `transmission`| `TEXT` | `TEXT` | DEFAULT 'Automático' | Tipo de caja (Automático, Manual, Secuencial) |
| `fuel` | `TEXT` | `TEXT` | DEFAULT 'Gasolina' | Tipo de combustible (Gasolina, Diésel, Híbrido, Eléctrico) |
| `body_type` | `TEXT` | `TEXT` | DEFAULT 'suv' | Carrocería (suv, pickup, sedan, deportivo, van) |
| `condition` | `TEXT` | `TEXT` | DEFAULT 'seminuevo' | Estado del auto (seminuevo, 0km) |
| `availability`| `TEXT` | `TEXT` | DEFAULT 'entrega_inmediata'| Disponibilidad (entrega_inmediata, por_pedido) |
| `origin` | `TEXT` | `TEXT` | DEFAULT 'importado' | Procedencia (nacional, importado) |
| `badge` | `TEXT` | `TEXT` | - | Etiqueta promocional o diferencial (ej. `PUERTO LIBRE`, `4x4`, `CASI NUEVO`) |
| `description` | `TEXT` | `TEXT` | - | Descripción comercial detallada del peritaje y condición |
| `images_json` | `TEXT` | `TEXT[]` | - | Rutas de imágenes en JSON o Array PostgreSQL |
| `catalog` | `TEXT` | `TEXT` | DEFAULT 'seminuevos' | Pestaña de catálogo (seminuevos, 0km) |
| `status` | `TEXT` | `TEXT` | DEFAULT 'active' | Estado operativo (active, reserved, sold, draft) |
| `mastertech` | `INTEGER` | `BOOLEAN` | DEFAULT 0 | Certificación técnica avalada por Taller MasterTech |
| `created_at` | `TEXT` | `TIMESTAMPTZ`| DEFAULT NOW() | Fecha de registro en el sistema |
| `updated_at` | `TEXT` | `TIMESTAMPTZ`| DEFAULT NOW() | Última actualización |

---

## 2. Tabla `site_settings` (Configuración del Sitio y Parámetros Globales)

Parámetros operativos, tarifas de calculadora, números de contacto y enlaces institucionales.

| Columna | Tipo SQLite | Tipo Postgres | Restricciones | Descripción |
|---|---|---|---|---|
| `key` | `TEXT` | `TEXT` | PRIMARY KEY | Clave única del parámetro |
| `value` | `TEXT` | `JSONB` / `TEXT` | NOT NULL | Valor del parámetro (string, número o JSON) |
| `descripcion` | `TEXT` | `TEXT` | - | Explicación del propósito de la configuración |
| `updated_at` | `TEXT` | `TIMESTAMPTZ` | DEFAULT NOW() | Fecha de modificación |

### Claves Principales
- `company_name`: "SemiNuevo"
- `whatsapp_number`: "584248700438"
- `calc_flete`: Tarifa base de flete marítimo USA-Venezuela ($3,500)
- `calc_aduana`: Arancel y nacionalización aduanal ($3,500)
- `calc_doc_vzla`: Trámites y placas venezolanas ($1,000)
- `calc_service_fee`: Honorarios periciales y de gestión ($900)
- `hero_slides`: Slides activos del slider principal del sitio

---

## 3. Tabla `agency_users` (Personal y Staff del Concesionario)

Gestión de asesores comerciales, administradores de plataforma y peritos técnicos.

| Columna | Tipo SQLite | Tipo Postgres | Restricciones | Descripción |
|---|---|---|---|---|
| `id` | `INTEGER` | `BIGSERIAL` | PRIMARY KEY | Identificador único del usuario |
| `full_name` | `TEXT` | `TEXT` | NOT NULL | Nombre y apellido |
| `email` | `TEXT` | `TEXT` | UNIQUE, NOT NULL| Correo institucional de acceso |
| `phone` | `TEXT` | `TEXT` | - | Teléfono / WhatsApp de contacto |
| `role` | `TEXT` | `TEXT` | DEFAULT 'sales' | Rol: `admin`, `sales`, `credit`, `mechanic` |
| `branch` | `TEXT` | `TEXT` | DEFAULT 'Porlamar' | Sucursal o departamento |
| `status` | `TEXT` | `TEXT` | DEFAULT 'active'| Estado: `active`, `suspended` |
| `notes` | `TEXT` | `TEXT` | - | Observaciones operativas |

---

## 4. Tabla `promotions` (Ofertas y Banners Promocionales)

Ofertas especiales mostradas en la sección de promociones del sitio web.

| Columna | Tipo SQLite | Tipo Postgres | Restricciones | Descripción |
|---|---|---|---|---|
| `id` | `TEXT` | `TEXT` | PRIMARY KEY | Identificador único de la oferta |
| `title` | `TEXT` | `TEXT` | NOT NULL | Título principal de la promoción |
| `subtitle` | `TEXT` | `TEXT` | - | Subtítulo / especificaciones breves |
| `description` | `TEXT` | `TEXT` | - | Descripción de la oportunidad de compra |
| `badge_text` | `TEXT` | `TEXT` | - | Badge distintivo (ej. `SELECCIÓN DE ASESORES`, `OFERTA ESPECIAL`) |
| `discount_text`| `TEXT` | `TEXT` | - | Monto o porcentaje de ahorro (ej. `HASTA -40%`, `$3,000 OFF`) |
| `cta_text` | `TEXT` | `TEXT` | - | Texto del botón de llamado a la acción |
| `cta_url` | `TEXT` | `TEXT` | - | Enlace de destino (ej. `https://COPART.seminuevoautos.com`, `catalogo`) |
| `is_featured` | `INTEGER` | `BOOLEAN` | DEFAULT 0 | 1 si es el banner horizontal destacado |
| `status` | `TEXT` | `TEXT` | DEFAULT 'active'| Estado de la promoción |

---

## 5. Tabla `inquiries` & `site_leads` (Clientes y Prospectos Comerciales)

Captación de leads generados desde el sitio web, calculadora de importación o formulario de contacto.

| Columna | Tipo SQLite | Tipo Postgres | Restricciones | Descripción |
|---|---|---|---|---|
| `id` | `INTEGER` | `BIGSERIAL` | PRIMARY KEY | Identificador único del lead |
| `name` | `TEXT` | `TEXT` | NOT NULL | Nombre del cliente |
| `phone` | `TEXT` | `TEXT` | - | Teléfono móvil |
| `email` | `TEXT` | `TEXT` | - | Correo electrónico |
| `vehicle_id` | `INTEGER` | `BIGINT` | - | ID del vehículo de interés |
| `status` | `TEXT` | `TEXT` | DEFAULT 'new' | Estado: `new`, `contacted`, `converted`, `lost` |
