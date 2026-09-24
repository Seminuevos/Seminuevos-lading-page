# Testing

Cómo verificar que el rol `concesionario` (y el resto del panel) sigue funcionando,
tanto de forma automatizada (sin intervención humana) como con un checklist manual
para el navegador.

## Automatizados

### 1. Backend — unit tests (Jest)

```bash
cd backend
npm test
```

113 tests. Incluye la cobertura de scoping por `concesionario_id` en `vehicles.service.spec.ts`
(`findAll`/`create`/`remove` respetan el dueño) y el fix del bug donde `DELETE` de un
vehículo ajeno devolvía 200 en vez de 404.

### 2. Backend — E2E contra la API real (requiere el backend corriendo)

```bash
cd backend
npx ts-node scripts/test-concesionario-e2e.ts
```

No usa mocks: crea un concesionario + usuario de prueba directo en la DB (con la
service_role key, mismo patrón que `scripts/create-admin.ts`), hace login real
contra `http://localhost:3001`, y ejercita `vehicles`/`vehicle-inquiries` de punta a
punta — incluyendo que un concesionario NO puede ver/editar/borrar el inventario de
otro. Limpia todos sus datos de prueba al final (incluso si algo falla). Seguro de
correr las veces que hagan falta.

### 3. Frontend — unit tests de la lógica de fusión del panel (`node --test`)

```bash
cd frontend
npm run test:client
```

Este es el que hubiera atrapado el segundo bug (el frontend mezclaba el catálogo
estático de respaldo con la respuesta de la API sin importar el rol, mostrándole a
un concesionario vehículos que no eran suyos). La lógica se extrajo de
`views/sm-op.hbs` a `public/vehicle-merge.js` (función pura, sin DOM ni red)
específicamente para poder testearla así — ver `public/vehicle-merge.test.js`.

## Manual (checklist para navegador)

Para lo que un test automatizado no cubre bien todavía (render visual, flujo completo
de login → UI). Se puede ejecutar a mano, o pedirle a Claude que lo haga con las
herramientas de `claude-in-chrome` (así se hizo la primera vez que se encontraron
ambos bugs de esta lista).

**Requisitos previos:**
```bash
# backend
cd backend && node --enable-source-maps dist/main.js   # (compilar antes con: npx tsc -p tsconfig.json)
# frontend
cd frontend && node --enable-source-maps dist/main.js  # (compilar antes con: npx tsc -p tsconfig.json)
# datos de demo (una vez; no se auto-limpian, ver el script para el SQL de borrado)
cd backend && npx ts-node scripts/seed-demo-concesionario.ts
```

Credenciales que deja el seed:
- Concesionario: `demo-concesionario@seminuevos-demo.local` / `DemoConcesionario123!`
- Staff normal: `demo-staff@seminuevos-demo.local` / `DemoStaff123!`

**Checklist** (todo en `http://localhost:3000/sm-op`):

1. **Login concesionario** — entrar con las credenciales de arriba. La barra lateral
   debe mostrar SOLO "Vehículos" y "Consultas de Vehículos" (nada de Promociones,
   Financiamiento, CRM, Alquileres, Usuarios, Configuración, etc.).
2. **Scoping del inventario** — la tabla debe mostrar exactamente 1 vehículo ("DEMO
   Toyota Corolla 2023 (Concesionario Norte)"), no el catálogo completo de la agencia.
3. **Editar el vehículo propio** — abrir el lápiz de edición, cambiar el precio,
   guardar. Debe confirmar "Vehículo actualizado con éxito" y el nuevo precio debe
   quedar reflejado en la tabla. El campo "Concesionario dueño" del formulario debe
   estar oculto para este rol.
4. **Consultas de Vehículos** — crear una consulta pública de prueba:
   ```bash
   curl -X POST http://localhost:3001/api/vehicle-inquiries -H "Content-Type: application/json" \
     -d '{"full_name":"Cliente Demo","phone":"04141234567","vehicle_id":<id del vehículo demo>,"inquiry_type":"compra"}'
   ```
   Recargar la pestaña "Consultas de Vehículos" en el panel — debe aparecer ahí.
5. **Salir y entrar como staff normal** (`demo-staff@...`) — la barra lateral ahora
   debe mostrar TODAS las secciones, incluida "Alquileres".
6. **Pestaña Alquileres** — debe cargar sin error (puede estar vacía: "No hay
   solicitudes de alquiler que coincidan"), sin 500 ni pantalla en blanco. Esto
   confirma que las migraciones de `rental_*` quedaron aplicadas de verdad.

### Filtros de búsqueda (marca/modelo/año/puertas) — solo en `http://localhost:3000/catalogo`

Estos filtros viven únicamente en la página de Catálogo (no hay ningún buscador en
el inicio — se sacó a pedido explícito).

7. **Selects poblados** — en cualquiera de las 3 secciones (Stock Local/Por
   Pedido/0KM), los selects de Marca, Modelo, Año y Puertas deben mostrar opciones
   reales del inventario (no aparecer vacíos, más allá del placeholder "Todos").
8. **Filtrar por Marca** — elegí una Marca (ej. "Toyota") — la grilla debe reducirse
   a solo esos vehículos, sin recargar la página.
9. **Combinar filtros** — con una Marca ya elegida, elegí además un Modelo (ej.
   "Corolla") — la grilla debe reducirse aún más, a solo ese modelo. Repetir con Año
   y Puertas para confirmar que cada uno filtra por separado y en conjunto.
10. **Panel admin — campos nuevos** — en `/sm-op`, editar cualquier vehículo: los
    campos "Marca", "Modelo" y "Puertas" deben estar en el formulario, guardarse, y
    reflejarse al reabrir el modal de edición.

Si algo de esto falla, es una regresión — no asumir que "ya se probó una vez" alcanza.
