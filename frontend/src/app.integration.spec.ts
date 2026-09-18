import { join } from 'path';
import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from './app.module';

describe('Frontend app (integración HTTP)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    process.env.API_BASE_URL = 'http://localhost:3001';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.useStaticAssets(join(__dirname, '..', 'public'));
    app.setBaseViewsDir(join(__dirname, '..', 'views'));
    app.setViewEngine('hbs');
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

  it.each(['/catalogo', '/vehiculo', '/servicios', '/nosotros', '/calculadora', '/estimator', '/postulacion'])(
    'GET %s responde 200',
    async (path) => {
      const res = await request(app.getHttpServer()).get(path);
      expect(res.status).toBe(200);
    },
  );

  it('GET /sm-op responde 200 con cabeceras noindex y no-store (panel de operaciones)', async () => {
    const res = await request(app.getHttpServer()).get('/sm-op');
    expect(res.status).toBe(200);
    expect(res.headers['x-robots-tag']).toMatch(/noindex/);
    expect(res.headers['cache-control']).toMatch(/no-store/);
  });

  it('sirve los assets estáticos migrados (style.css, script.js)', async () => {
    const css = await request(app.getHttpServer()).get('/style.css');
    const js = await request(app.getHttpServer()).get('/script.js');
    expect(css.status).toBe(200);
    expect(js.status).toBe(200);
  });
});
