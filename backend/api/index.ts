import 'reflect-metadata';
import express from 'express';
import { createApp } from '../src/create-app';

/**
 * Entrypoint serverless para Vercel. Requiere en este proyecto (Root
 * Directory = backend/ en Vercel) un `vercel.json` que reescriba todas las
 * rutas hacia esta función — ver backend/vercel.json. El `req.url` original
 * (p. ej. /api/auth/login) llega intacto, así que el router de Nest lo
 * resuelve exactamente igual que en local.
 */
const expressApp = express();
let bootstrapped: Promise<void> | null = null;

async function ensureBootstrapped(): Promise<void> {
  if (!bootstrapped) {
    bootstrapped = (async () => {
      const app = await createApp(expressApp);
      await app.init();
    })();
  }
  return bootstrapped;
}

export default async function handler(req: express.Request, res: express.Response) {
  await ensureBootstrapped();
  expressApp(req, res);
}
