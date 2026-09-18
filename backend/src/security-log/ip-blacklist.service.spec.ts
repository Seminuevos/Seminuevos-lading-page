import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { IpBlacklistService } from './ip-blacklist.service';
import { SupabaseService } from '../supabase/supabase.service';
import { createQueryBuilderMock, createSupabaseClientMock } from '../test-utils/supabase-mock';

describe('IpBlacklistService', () => {
  let service: IpBlacklistService;
  let client: ReturnType<typeof createSupabaseClientMock>;

  beforeEach(async () => {
    client = createSupabaseClientMock();
    const module = await Test.createTestingModule({
      providers: [IpBlacklistService, { provide: SupabaseService, useValue: { getClient: () => client } }],
    }).compile();

    service = module.get(IpBlacklistService);
  });

  it('findAll devuelve las IPs bloqueadas', async () => {
    client.from.mockReturnValue(createQueryBuilderMock({ data: [{ ip: '1.2.3.4' }], error: null }));
    await expect(service.findAll()).resolves.toHaveLength(1);
  });

  it('block hace upsert por ip y devuelve la fila', async () => {
    const builder = createQueryBuilderMock({ data: { ip: '1.2.3.4' }, error: null });
    client.from.mockReturnValue(builder);

    await service.block({ ip: '1.2.3.4', reason: 'abuso' });

    const [rows, options] = (builder.upsert as jest.Mock).mock.calls[0];
    expect(rows[0]).toEqual(expect.objectContaining({ ip: '1.2.3.4', reason: 'abuso' }));
    expect(options).toEqual({ onConflict: 'ip' });
  });

  it('block lanza BadRequestException si supabase falla', async () => {
    client.from.mockReturnValue(createQueryBuilderMock({ data: null, error: { message: 'boom' } }));
    await expect(service.block({ ip: '1.2.3.4' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('unblock elimina la fila por ip', async () => {
    const builder = createQueryBuilderMock({ data: null, error: null });
    client.from.mockReturnValue(builder);
    await expect(service.unblock('1.2.3.4')).resolves.toBeUndefined();
    expect(builder.eq).toHaveBeenCalledWith('ip', '1.2.3.4');
  });
});
