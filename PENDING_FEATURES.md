# Features pendientes (deferidas a pedido explícito, 2026-09-18)

Del backlog pedido el 2026-09-18, todo se implementó excepto estos 3 puntos
— quedan documentados aquí con el detalle ya aclarado en la conversación,
para no perder contexto cuando se retomen.

## 1. Vehículos duplicados visibles en el catálogo

**Qué se pidió:** "modificar que el stock no se repita" → confirmado que se
refiere a vehículos duplicados apareciendo en el catálogo público.

**Causa probable:** `script.js` → `applyDataToPanels()` combina 3 fuentes al
armar la lista final por catálogo (seminuevos/por-pedido/0km):

1. Vehículos de la API (`/api/public/vehicles`, la fuente real).
2. `localStorage.getItem('sn_vehicles')` — una copia local que el panel
   admin escribía como "respaldo inmediato" al guardar (ver
   `sm-op.hbs`, comentarios "Respaldo local inmediato").
3. Arrays estáticos (`vehiclesSeminuevos`, `vehicles0km` de `data.js`) como
   fallback si la API no devuelve nada.

La función `resolveVehicles()` intenta priorizar la fuente DB sobre la
estática, pero el respaldo local (2) puede quedar con una copia vieja de un
vehículo que la API ya devuelve actualizada — mismo vehículo, dos entradas
con IDs o timestamps ligeramente distintos, ambas pasan el filtro `deleted`.

**Cómo abordarlo:** antes de renderizar, deduplicar por `id` (si coincide)
y por `title` normalizado (lowercase + trim) como fallback, quedándose con
la versión más reciente. Candidato: una función `dedupeVehicles(arr)`
llamada justo antes de `renderAllPanels()` en `script.js`.

## 2. Numeración de publicación separada por catálogo

**Qué se pidió:** cada catálogo (Stock Local / Importación / 0KM) debería
tener su propia numeración secuencial visible (ej. "Stock #1, #2, #3..." e
"Importación #1, #2, #3..." de forma independiente), en vez de mostrar el
`id` interno de la base de datos (que es un contador global compartido por
todas las filas de `vehicles`).

**Cómo abordarlo:** esto es una vista derivada, no debería tocar el `id`
real (usado como PK y en URLs `/vehiculo?id=`). Opciones:

- Calcular el número en el cliente al renderizar: ordenar el array filtrado
  por `catalog` y usar el índice + 1 como "N° de publicación" (simple, pero
  cambia si se borra/agrega un vehículo en medio de la lista).
- O agregar una columna `catalog_sequence` en `vehicles`, poblada por un
  trigger que calcule `ROW_NUMBER() OVER (PARTITION BY catalog ORDER BY
  created_at)` — más estable, pero requiere migración y recalcular al
  insertar/borrar.

Falta decidir cuál de las dos approaches prefieren antes de implementar.

## 3. Hero dinámico con vehículos reales + precio "Desde $XXX/mes"

**Qué se pidió:** las imágenes del hero (hoy 3 slides fijas configuradas en
`site_settings.hero_slides`) deberían mostrar vehículos REALES del
inventario actual, cada una debe llevar a la publicación de ese vehículo
específico, y el precio debe decir "Desde $XXX/mes" en vez del precio de
contado.

**Por qué se deferió:** el "$XXX/mes" requiere una fórmula de financiamiento
(% de cuota inicial, plazo en meses, tasa de interés) que todavía no está
definida — hay lógica de financiamiento parcial en `calculadora.html` y en
`sm-op.hbs` (`calcularCreditoPlan()`, planes de financiamiento internos) que
habría que revisar para ver si ya calculan esto de forma reutilizable, o si
hace falta una fórmula nueva específica para el hero.

**Cómo abordarlo cuando se retome:**
1. Confirmar la fórmula (revisar `calcularCreditoPlan()` en `sm-op.hbs` como
   punto de partida, o definir una nueva: cuota inicial %, plazo, tasa).
2. Reemplazar la fuente del hero: en vez de `site_settings.hero_slides`
   (curado a mano), seleccionar N vehículos reales de `/api/public/vehicles`
   (¿los más recientes? ¿los marcados `financing_eligible`? — falta decidir
   el criterio de selección).
3. Cada slide enlaza a `/vehiculo?id=<id>` en vez de ser solo decorativo.
