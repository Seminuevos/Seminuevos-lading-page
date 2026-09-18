import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import express, { Express } from 'express';
import { AppModule } from './app.module';

/**
 * Bootstrap compartido por `main.ts` (servidor persistente, `nest start`) y
 * `api/index.ts` (función serverless de Vercel) — para que ambos entornos
 * apliquen exactamente el mismo CORS/validación/cabeceras de seguridad.
 */
export async function createApp(expressInstance: Express = express()): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, new ExpressAdapter(expressInstance));
  const config = app.get(ConfigService);

  // Vercel (y cualquier proxy) siempre llega vía reverse proxy — sin esto,
  // req.ip sería la IP interna del proxy, no la del visitante real, y tanto
  // el rate limiting como el IpBlacklistGuard y los security_logs quedarían
  // ciegos a la IP real.
  app.set('trust proxy', 1);

  const allowedOrigins = (config.get<string>('CORS_ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.use((_req: unknown, res: { setHeader: (k: string, v: string) => void }, next: () => void) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  return app;
}
