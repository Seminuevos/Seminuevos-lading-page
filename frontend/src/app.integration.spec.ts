import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { createApp } from './create-app';

describe('Frontend app (integración HTTP)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    process.env.API_BASE_URL = 'http://localhost:3001';
    app = await createApp();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET / responde 200 e inyecta la URL del backend, nunca la de Supabase', async () => {
    const res = await request(app.getHttpServer()).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('window.API_BASE_URL = "http://localhost:3001"');
    expect(res.text).not.toMatch(/supabase\.co/i);
  });

  it.each(['/catalogo', '/vehiculo', '/servicios', '/nosotros', '/calculadora', '/estimator', '/postulacion', '/sm-op'])(
    'GET %s responde 200 y nunca sirve una URL, key o cliente de Supabase',
    async (path) => {
      const res = await request(app.getHttpServer()).get(path);
      expect(res.status).toBe(200);
      // Regresión: el frontend no debe volver a incluir credenciales ni el SDK
      // de Supabase — todo pasa por el backend (window.API_BASE_URL). No se
      // busca el substring genérico "supabase.co" porque hay comparaciones
      // legítimas de URLs de imágenes (ej. detectar si ya están en Storage);
      // sí se busca la URL real del proyecto, que nunca debería aparecer aquí.
      expect(res.text).not.toMatch(/gfvmugsbizmvlziljxir\.supabase\.co/i);
      expect(res.text).not.toMatch(/supabase-js/i);
      expect(res.text).not.toMatch(/createClient\s*\(/);
      expect(res.text).not.toMatch(/SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY/);
    },
  );

  it('GET /sm-op responde con cabeceras noindex y no-store (panel de operaciones)', async () => {
    const res = await request(app.getHttpServer()).get('/sm-op');
    expect(res.headers['x-robots-tag']).toMatch(/noindex/);
    expect(res.headers['cache-control']).toMatch(/no-store/);
  });

  it('sirve los assets estáticos migrados (style.css, script.js)', async () => {
    const css = await request(app.getHttpServer()).get('/style.css');
    const js = await request(app.getHttpServer()).get('/script.js');
    expect(css.status).toBe(200);
    expect(js.status).toBe(200);
  });

  it.each(['/script.js', '/vehiculo.js', '/supabase-config.js'])(
    'GET %s nunca contiene una URL o key de Supabase',
    async (path) => {
      const res = await request(app.getHttpServer()).get(path);
      expect(res.status).toBe(200);
      expect(res.text).not.toMatch(/gfvmugsbizmvlziljxir\.supabase\.co/i);
      expect(res.text).not.toMatch(/createClient\s*\(/);
    },
  );
});
