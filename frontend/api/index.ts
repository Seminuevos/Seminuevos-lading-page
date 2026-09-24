import 'reflect-metadata';
import express from 'express';
import { createApp } from '../src/create-app';

/**
 * Entrypoint serverless para Vercel (Root Directory = frontend/ en ese
 * proyecto de Vercel). Ver frontend/vercel.json: reescribe todo hacia esta
 * función, que sirve tanto las vistas (.hbs) como los estáticos de public/
 * — así el comportamiento es idéntico al `nest start` local, sin depender
 * de cómo Vercel decida servir una carpeta `public/` por convención.
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
