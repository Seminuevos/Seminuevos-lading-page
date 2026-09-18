# Imágenes sin referencia estática (candidatas a eliminar)

Estos 9 archivos no aparecen referenciados en ningún `.hbs`, `.js` o `.css` de
`frontend/`. Todos parecen ser variantes duplicadas o descartadas de branding
(logos/monogramas viejos, posters de marca, una imagen sin nombre
descriptivo). Se movieron aquí, **sin borrarlos**, para que los revises y
decidas si eliminarlos definitivamente.

- `brand-poster.png`, `historia-brand.png`, `car1.png`, `car2.png`
- `monograma.png`, `monograma-transparente.png` (se usa `monograma-final-3d.png`)
- `og-logo.jpg`, `og-logo-primary.png` (se usa `og-logo.png`)
- `media__1776484247938.jpg` (nombre autogenerado, sin referencia)

## Qué NO se tocó, y por qué

**No moví nada dentro de `images/gallery/` (729 archivos), `images/4runner/`,
ni los archivos sueltos con nombre de modelo de vehículo** (p. ej.
`2025-nissan-kicks-sv.jpg`, `toyota-4runner-2021-sr5.jpg`,
`honda-hrv-2024-sport.jpg`, etc.), aunque un grep estático tampoco los
encuentra en el código.

Eso es esperado: esas fotos se referencian dinámicamente desde la tabla
`vehicles` de Supabase (columna `images`, un array de rutas) y desde
`promotions_list`/`hero_slides` en `site_settings` — datos que viven en la
base de datos, no en el código fuente. Un grep contra los archivos del repo
nunca las va a encontrar aunque estén activamente en uso en el catálogo en
vivo. Moverlas a ciegas habría roto fotos de vehículos publicados.

Si quieres una auditoría real de esas 729+ imágenes, hay que cruzarlas contra
el contenido actual de la tabla `vehicles` (columna `images`) y de
`site_settings.promotions_list` / `hero_slides`, no contra el código.
