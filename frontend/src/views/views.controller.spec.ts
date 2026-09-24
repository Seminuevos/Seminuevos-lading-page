import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ViewsController } from './views.controller';

describe('ViewsController (unit)', () => {
  let controller: ViewsController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [ViewsController],
      providers: [{ provide: ConfigService, useValue: { get: () => 'http://localhost:3001' } }],
    }).compile();

    controller = module.get(ViewsController);
  });

  const routes: Array<keyof ViewsController> = [
    'index',
    'catalogo',
    'vehiculo',
    'servicios',
    'nosotros',
    'calculadora',
    'estimator',
    'postulacion',
    'smOp',
  ];

  it.each(routes)('%s expone apiBaseUrl al template desde la configuración', (routeMethod) => {
    const result = (controller[routeMethod] as () => { apiBaseUrl: string })();
    expect(result).toEqual({ apiBaseUrl: 'http://localhost:3001' });
  });

  it('nunca incluye una URL o clave de Supabase en el modelo enviado a las vistas', () => {
    for (const routeMethod of routes) {
      const result = (controller[routeMethod] as () => { apiBaseUrl: string })();
      const serialized = JSON.stringify(result);
      expect(serialized).not.toMatch(/supabase\.co/i);
      expect(serialized).not.toMatch(/service_role/i);
    }
  });
});
