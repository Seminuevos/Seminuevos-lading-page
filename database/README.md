# Sistema Integral de Base de Datos y Respaldo — Seminuevos Autos

Paquete autocontenido y sincronizado que incluye la **base de datos relacional**, el **inventario de vehículos**, el **servidor web / API REST local**, las **herramientas de respaldo triple** y el **verificador visual interactivo**.

---

## Contenido del Paquete

```
SEMINUEVOS/
├── index.html                 Portal de inicio y verificador visual interactivo (abrir con doble clic)
├── seminuevos.db              Base de datos SQLite 3 nativa precargada con los 46 vehículos y settings
├── server.js                  Servidor web y API REST standalone (Node.js nativo, puerto 5050)
├── db.js                      Capa de acceso y consultas a SQLite
├── schema_sqlite.sql          Esquema DDL optimizado para SQLite 3
├── schema.sql                 Esquema DDL para PostgreSQL y Supabase con RLS y triggers
├── seed_data.sql              Sentencias SQL INSERT completas para reconstruir la base
├── data_export.json           Exportación JSON estructurada con la totalidad de entidades
├── DICCIONARIO_DATOS.md       Documentación técnica detallada de tablas y columnas
├── README.md                  Este manual de operación y guía de despliegue
├── iniciar_servidor.bat       Script de 1 clic para iniciar el servidor local en http://localhost:5050
├── sincronizar_respaldo.bat   Script de 1 clic para sincronización triple (Supabase <-> PC Local <-> GitHub)
└── csv/                       Directorio de tablas tabulares para Excel y Google Sheets
    ├── vehiculos.csv          Listado de los 46 vehículos con precios, años y especificaciones
    ├── configuracion.csv      Parámetros de settings, fletes y contacto
    ├── usuarios.csv           Personal y staff del concesionario
    └── promociones.csv        Ofertas especiales y banners activos
```

---

## Modos de Uso y Operación

### Opción A: Verificación Visual Inmediata (Sin Servidor)
Haz **doble clic** directamente sobre `index.html` en esta carpeta.
Podrás:
1. Comprobar las métricas del inventario (46 vehículos, 6 entrega inmediata, 40 por pedido, configuraciones, usuarios).
2. Explorar y buscar vehículos con fotos y fichas técnicas.
3. Consultar las tablas de base de datos en pantalla de forma interactiva.
4. Inspeccionar y copiar los datos en JSON y SQL.

### Opción B: Iniciar el Servidor Web y API Standalone
Haz doble clic sobre `iniciar_servidor.bat` o ejecuta:
```bash
node server.js
```
El servidor arrancará inmediatamente en el **puerto 5050**:
- **Portal de Verificación:** `http://localhost:5050/`
- **API Vehículos:** `http://localhost:5050/api/vehicles`
- **API Vehículo por ID:** `http://localhost:5050/api/vehicles/1`
- **API Configuración:** `http://localhost:5050/api/settings`
- **API Estadísticas:** `http://localhost:5050/api/stats`
- **API Promociones:** `http://localhost:5050/api/promotions`
- **Descarga JSON:** `http://localhost:5050/data_export.json`
- **Descarga CSV:** `http://localhost:5050/csv/vehiculos.csv`

### Opción C: Sincronización Triple con 1 Clic
Haz doble clic en `sincronizar_respaldo.bat`.
El sistema automáticamente:
1. Consulta la nube en **Supabase** para obtener los últimos settings.
2. **Sustituye completamente la base de datos vieja** eliminando archivos previos y reconstruyendo `seminuevos.db` desde cero para evitar registros residuales o inconsistencias.
3. Actualiza `data_export.json`, `seed_data.sql` y todos los archivos CSV en la carpeta local y en el repositorio.
4. Realiza commit y push a **GitHub** con autenticación automática.

---

## Consultas SQL de Ejemplo

### 1. Vehículos en stock de entrega inmediata en Porlamar:
```sql
SELECT id, title, price, year, km, engine, badge
FROM vehicles
WHERE availability = 'entrega_inmediata' AND status = 'active'
ORDER BY year DESC;
```

### 2. Vehículos por pedido / subastas en USA ordenados por precio:
```sql
SELECT id, title, price, year, engine, body_type
FROM vehicles
WHERE availability = 'por_pedido' AND status = 'active';
```

### 3. Contar vehículos agrupados por tipo de carrocería:
```sql
SELECT body_type, COUNT(*) as total
FROM vehicles
GROUP BY body_type
ORDER BY total DESC;
```
