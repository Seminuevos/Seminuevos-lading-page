import { Test } from '@nestjs/testing';
import { PublicAnalyticsService } from './public-analytics.service';
import { SupabaseService } from '../supabase/supabase.service';
import { createQueryBuilderMock, createSupabaseClientMock } from '../test-utils/supabase-mock';

describe('PublicAnalyticsService', () => {
  let service: PublicAnalyticsService;
  let client: ReturnType<typeof createSupabaseClientMock> & { rpc: jest.Mock };

  beforeEach(async () => {
    client = { ...createSupabaseClientMock(), rpc: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [PublicAnalyticsService, { provide: SupabaseService, useValue: { getClient: () => client } }],
    }).compile();

    service = module.get(PublicAnalyticsService);
  });

  it('nunca lanza una excepción aunque falle el insert de analytics', async () => {
    client.from.mockReturnValue(createQueryBuilderMock({ data: null, error: { message: 'boom' } }));
    await expect(service.track({ event_type: 'click' })).resolves.toBeUndefined();
  });

  it('inserta el evento con los datos recibidos', async () => {
    const builder = createQueryBuilderMock({ data: null, error: null });
    client.from.mockReturnValue(builder);

    await service.track({ event_type: 'view', visitor_id: 'v1', url: '/catalogo' });

    const insertPayload = (builder.insert as jest.Mock).mock.calls[0][0][0];
    expect(insertPayload.event_type).toBe('view');
    expect(insertPayload.visitor_id).toBe('v1');
  });

  it('incrementVehicleViews invoca el RPC con el id numérico y no lanza si falla', async () => {
    client.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(service.incrementVehicleViews('42')).resolves.toBeUndefined();
    expect(client.rpc).toHaveBeenCalledWith('increment_vehicle_views', { vehicle_id: 42 });
  });
});
