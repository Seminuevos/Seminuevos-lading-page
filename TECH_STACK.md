# Estándar de Infraestructura y Arquitectura Oficial
**Definido por Dirección Técnica (Gustavo Carrasquero)**

Este documento establece el stack tecnológico, flujo de despliegue y ciclo de vida de contenidos obligatorio para el desarrollo de landing pages, módulos y aplicaciones del ecosistema.

---

## 1. Stack Tecnológico Principal

| Componente | Tecnología Seleccionada | Detalle / Uso |
| :--- | :--- | :--- |
| **Base de Datos** | **PostgreSQL** | Motor relacional estándar para persistencia de datos. |
| **ORM** | **Prisma** | Modelado de esquemas, migraciones y tipado estricto en TypeScript. |
| **Backend** | **NestJS** | Framework modular en TypeScript, arquitectura empresarial, validaciones (DTOs), inyección de dependencias. |
| **Frontend** | **React / Vite** | Interfaces web modernas, ligeras, componentes modulares y alto rendimiento. |
| **Seguridad / Auth** | **JWT / Firebase Auth** | Autenticación basada en tokens JWT con opción de Social Login mediante Firebase. |

---

## 2. Infraestructura y Despliegue (DevOps)

1. **Servidor:** VPS (Virtual Private Server).
2. **Control de Versiones y CI/CD:** GitHub como repositorio central y automatización de despliegues.
3. **Gestor de Procesos:** **PM2** para mantener servicios backend y frontend activos con reinicio automático y balanceo.
4. **Seguridad SSL:** **Certbot (Let's Encrypt)** para emisión y renovación automática de certificados HTTPS.

---

## 3. Ciclo de Vida de Landing Pages: Borrador y Publicación (Draft & Publish Workflow)

Para toda Landing Page o módulo comercial gestionable, se debe implementar de forma obligatoria el ciclo de estados:

### 3.1. Estados Soportados (Enum de Estado)
En el esquema de Prisma y base de datos PostgreSQL:
```prisma
enum ContentStatus {
  DRAFT       // Borrador: editable, no visible públicamente en producción
  PUBLISHED   // Publicada / Activa: visible al público general
  ARCHIVED    // Archivada: retirada de circulación pero preservada en histórico
}

model LandingPage {
  id          String        @id @default(uuid())
  slug        String        @unique
  title       String
  content     Json          // Bloques, sliders, textos, configuraciones
  status      ContentStatus @default(DRAFT)
  publishedAt DateTime?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}
```

### 3.2. Reglas de Negocio en NestJS & Frontend (React/Vite)
1. **Acceso Público:** Las rutas públicas de la API (`GET /api/landings/:slug`) solo devuelven landing pages con estado `PUBLISHED`.
2. **Modo Previsualización (Preview Token / Admin Auth):**
   - Los usuarios administradores autenticados vía **JWT** pueden visualizar y probar la landing page en modo borrador mediante un enlace temporal o bandera de previsualización (`?preview=true` con token válido).
3. **Activación Inmediata (1-Click Publish):**
   - El panel de administración incluye la acción de **"Guardar como Borrador"** y **"Publicar / Activar"** en cualquier momento, cambiando el estado de `DRAFT` a `PUBLISHED` al instante sin necesidad de redeployar código.
4. **Desactivación o Regreso a Borrador:**
   - Una landing activa puede ser devuelta a estado borrador (`DRAFT`) para hacer ajustes privados antes de volverla a activar.

---

## 4. Pauta para Nuevos Desarrollos
A partir de esta instrucción, cualquier nueva landing page o refactorización que se inicie se estructurará siguiendo este stack:
- Frontend desacoplado en **React + Vite**.
- API robusta en **NestJS + Prisma** con soporte nativo de estados `DRAFT` y `PUBLISHED`.
- Base de datos relacional **PostgreSQL**.
- Despliegue en **VPS con PM2 y Certbot**.
