# Estándar de Infraestructura y Arquitectura Oficial
**Definido por Dirección Técnica (Gustavo Carrasquero)**

Este documento establece el stack tecnológico y flujo de despliegue obligatorio para el desarrollo de landing pages, módulos y aplicaciones del ecosistema.

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

## 3. Pauta para Nuevos Desarrollos
A partir de esta instrucción, cualquier nueva landing page o refactorización que se inicie se estructurará siguiendo este stack:
- Frontend desacoplado en **React + Vite**.
- API robusta en **NestJS + Prisma**.
- Base de datos relacional **PostgreSQL**.
- Despliegue en **VPS con PM2 y Certbot**.
