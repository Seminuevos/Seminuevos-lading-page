# Deploy en Vercel — monorepo `frontend/` + `backend/`

Este repo ahora es un monorepo con dos aplicaciones NestJS independientes:

```
Seminuevos-lading-page/
├── frontend/   → vistas públicas (Nest + Handlebars), sirve las 9 páginas del sitio
└── backend/    → API (Nest + Supabase + JWT)
```

Cada una se despliega como **un proyecto de Vercel separado**, apuntando ambos
al mismo repositorio de Git pero con distinto **Root Directory**. Es el
patrón recomendado por Vercel para monorepos — no requiere workspaces ni
configuración especial, solo dos proyectos.

## 1. Proyecto del backend

1. En Vercel: **Add New → Project** → importa este repo.
2. **Root Directory**: `backend`
3. Framework Preset: "Other" (Vercel detecta `api/index.ts` automáticamente).
4. Environment Variables (Project Settings → Environment Variables):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET` (generar con `openssl rand -base64 64` — **obligatorio**, el backend no arranca sin él)
   - `JWT_EXPIRES_IN` (opcional, default `12h`)
   - `CORS_ALLOWED_ORIGINS` = la URL del proyecto de frontend en Vercel (p. ej. `https://seminuevos-frontend.vercel.app`), separadas por coma si hay más de un dominio (incluye tu dominio custom cuando lo conectes)
   - `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (opcional, para `/api/email/send`)
   - `APIFY_API_KEY` (opcional, para el importador de subastas en `/api/scrape`)
5. Deploy. La API queda en `https://<tu-proyecto-backend>.vercel.app/api/...`.

`backend/vercel.json` ya reescribe todas las rutas hacia la función serverless
única en `api/index.ts`, que envuelve la app Nest completa (Express adapter).

## 2. Proyecto del frontend

1. **Add New → Project** → mismo repo.
2. **Root Directory**: `frontend`
3. Environment Variables:
   - `API_BASE_URL` = la URL del proyecto de backend del paso anterior (p. ej. `https://<tu-proyecto-backend>.vercel.app`)
4. Deploy. El sitio queda en `https://<tu-proyecto-frontend>.vercel.app/`.

`frontend/vercel.json` reescribe todo hacia `api/index.ts`, que sirve tanto
las vistas (`.hbs`) como los estáticos de `public/` (CSS, JS, imágenes) desde
la misma función — así no depende de cómo Vercel decida servir una carpeta
`public/` por convención.

## 3. Verificación post-deploy (no pude probarlo desde este sandbox)

Después del primer deploy de cada proyecto, confirma:

- `GET /` en el frontend responde 200 y el HTML contiene
  `window.API_BASE_URL = "https://<tu-backend>.vercel.app"`.
- `GET /style.css`, `/script.js`, `/images/...` responden 200 (confirma que
  `includeFiles` en `frontend/vercel.json` sí empaquetó `public/` y `views/`
  dentro de la función — si da 404, es lo primero a revisar).
- `POST /api/auth/login` en el backend responde (401 con credenciales
  inválidas es suficiente para confirmar que la función levantó).
- Prueba un login real desde `/sm-op` del frontend y confirma que la request
  a `/api/auth/login` sale hacia el dominio del backend, no hacia el propio
  frontend (Network tab del navegador).

## 4. Dominio único (opcional)

Si más adelante quieres que ambos convivan bajo el mismo dominio
(`seminuevoautos.com` sirviendo el sitio y `seminuevoautos.com/api/*` la
API), se puede configurar como **Rewrite entre proyectos de Vercel**
(`vercel.json` del frontend con un rewrite a la URL absoluta del backend) o
apuntando el dominio del backend a un subdominio (`api.seminuevoautos.com`).
No lo configuré por defecto para no asumir cuál dominio usarán en producción.

## Notas

- `backend/scripts/create-admin.ts` crea el primer usuario admin
  (`agency_users`) — hace falta correrlo una vez, localmente, con las env
  vars de Supabase de producción, antes de poder hacer login por primera vez.
- El importador de subastas (`/api/scrape`) hace llamadas a Apify que pueden
  tardar hasta ~130s en el peor caso; el plan gratuito de Vercel limita las
  funciones a 10s y el Pro a 60s por defecto (configurable hasta 300s). Si
  usas ese importador en producción, revisa el límite de tu plan.
