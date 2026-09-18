import { Test } from '@nestjs/testing';
import { PublicController } from './public.controller';
import { PublicSettingsService } from './public-settings.service';
import { PublicAnalyticsService } from './public-analytics.service';
import { SecurityLogService } from '../security-log/security-log.service';
import { VehiclesService } from '../vehicles/vehicles.service';

describe('PublicController', () => {
  let controller: PublicController;
  let vehiclesService: { findPublic: jest.Mock; findOnePublic: jest.Mock };
  let settingsService: { getPublicSettings: jest.Mock };
  let analyticsService: { track: jest.Mock; incrementVehicleViews: jest.Mock };
  let securityLogService: { log: jest.Mock };

  const fakeVehicles = [
    { id: 1, title: 'Toyota Corolla 2022', price: '$18,000', year: 2022, status: undefined },
    { id: 2, title: 'Kia Sportage 2021', price: '$21,500', year: 2021, status: undefined },
  ];

  beforeEach(async () => {
    vehiclesService = {
      findPublic: jest.fn().mockResolvedValue(fakeVehicles),
      findOnePublic: jest.fn().mockResolvedValue(fakeVehicles[0]),
    };
    settingsService = {
      getPublicSettings: jest.fn().mockResolvedValue({ company_name: '"SemiNuevo"' }),
    };
    analyticsService = {
      track: jest.fn().mockResolvedValue(undefined),
      incrementVehicleViews: jest.fn().mockResolvedValue(undefined),
    };
    securityLogService = { log: jest.fn().mockResolvedValue(undefined) };

    const module = await Test.createTestingModule({
      controllers: [PublicController],
      providers: [
        { provide: VehiclesService, useValue: vehiclesService },
        { provide: PublicSettingsService, useValue: settingsService },
        { provide: PublicAnalyticsService, useValue: analyticsService },
        { provide: SecurityLogService, useValue: securityLogService },
      ],
    }).compile();

    controller = module.get(PublicController);
  });

  it('permite consultar el catálogo de vehículos sin ninguna credencial ni endpoint de Supabase', async () => {
    // El "cliente" (frontend) solo conoce esta ruta del backend — nunca
    // SUPABASE_URL ni SUPABASE_ANON_KEY, que ni siquiera existen en este test.
    expect(process.env.SUPABASE_URL).toBeUndefined();
    expect(process.env.SUPABASE_ANON_KEY).toBeUndefined();

    const response = (await controller.findVehicles()) as unknown as { data: typeof fakeVehicles };

    expect(vehiclesService.findPublic).toHaveBeenCalledTimes(1);
    expect(response.data).toHaveLength(2);
    expect(response.data[0].title).toBe('Toyota Corolla 2022');

    const serialized = JSON.stringify(response);
    expect(serialized).not.toMatch(/supabase\.co/i);
    expect(serialized).not.toMatch(/service_role/i);
  });

  it('permite consultar un vehículo puntual por id sin autenticación', async () => {
    const response = (await controller.findVehicle('1')) as unknown as {
      data: (typeof fakeVehicles)[number];
    };
    expect(vehiclesService.findOnePublic).toHaveBeenCalledWith('1');
    expect(response.data.id).toBe(1);
  });

  it('expone únicamente settings de la lista blanca (nunca API keys ni el directorio de usuarios)', async () => {
    const response = await controller.findSettings();
    expect(response.data).toEqual({ company_name: '"SemiNuevo"' });
    expect(response.data).not.toHaveProperty('resend_api_key');
    expect(response.data).not.toHaveProperty('scraper_proxy_key');
    expect(response.data).not.toHaveProperty('agency_users_directory');
  });

  it('registra una vista de vehículo sin autenticación', async () => {
    await controller.trackView('1');
    expect(analyticsService.incrementVehicleViews).toHaveBeenCalledWith('1');
  });

  it('registra un evento de analítica anónimo', async () => {
    await controller.trackEvent({ event_type: 'click' });
    expect(analyticsService.track).toHaveBeenCalledWith({ event_type: 'click' });
  });

  it('registra un evento de seguridad reportado por el cliente, con la IP capturada por el servidor', async () => {
    await controller.reportSecurityEvent({ event_type: 'xss_attempt', details: 'input sospechoso' }, '203.0.113.9');
    expect(securityLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: 'xss_attempt', ip_address: '203.0.113.9', severity: 'warning' }),
    );
  });
});
