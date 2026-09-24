import { Test } from '@nestjs/testing';
import { SecurityLogService } from './security-log.service';
import { SupabaseService } from '../supabase/supabase.service';
import { createQueryBuilderMock, createSupabaseClientMock } from '../test-utils/supabase-mock';

describe('SecurityLogService', () => {
  let service: SecurityLogService;
  let client: ReturnType<typeof createSupabaseClientMock>;

  beforeEach(async () => {
    client = createSupabaseClientMock();
    const module = await Test.createTestingModule({
      providers: [SecurityLogService, { provide: SupabaseService, useValue: { getClient: () => client } }],
    }).compile();

    service = module.get(SecurityLogService);
  });

  it('nunca lanza una excepción aunque supabase falle al insertar', async () => {
    client.from.mockReturnValue(createQueryBuilderMock({ data: null, error: { message: 'boom' } }));
    await expect(
      service.log({ event_type: 'LOGIN_FAILED', ip_address: '127.0.0.1' }),
    ).resolves.toBeUndefined();
  });

  it('inserta el evento con severidad por defecto info', async () => {
    const builder = createQueryBuilderMock({ data: null, error: null });
    client.from.mockReturnValue(builder);

    await service.log({ event_type: 'LOGIN_SUCCESS', ip_address: '127.0.0.1', user_id: 'u1' });

    const insertPayload = (builder.insert as jest.Mock).mock.calls[0][0][0];
    expect(insertPayload.severity).toBe('info');
    expect(insertPayload.user_id).toBe('u1');
  });

  it('findRecent devuelve los logs más recientes', async () => {
    client.from.mockReturnValue(createQueryBuilderMock({ data: [{ id: 1 }], error: null }));
    const result = await service.findRecent();
    expect(result).toHaveLength(1);
  });
});
