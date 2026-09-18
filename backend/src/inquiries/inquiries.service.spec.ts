import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { InquiriesService } from './inquiries.service';
import { SupabaseService } from '../supabase/supabase.service';
import { createQueryBuilderMock, createSupabaseClientMock } from '../test-utils/supabase-mock';

describe('InquiriesService', () => {
  let service: InquiriesService;
  let client: ReturnType<typeof createSupabaseClientMock>;

  beforeEach(async () => {
    client = createSupabaseClientMock();
    const module = await Test.createTestingModule({
      providers: [InquiriesService, { provide: SupabaseService, useValue: { getClient: () => client } }],
    }).compile();

    service = module.get(InquiriesService);
  });

  it('crea una consulta con los datos saneados y la IP del request', async () => {
    const builder = createQueryBuilderMock({ data: { id: 1 }, error: null });
    client.from.mockReturnValue(builder);

    await service.create({ full_name: 'Juan Pérez', message: 'Interesado en el catálogo' }, '203.0.113.5');

    const insertPayload = (builder.insert as jest.Mock).mock.calls[0][0][0];
    expect(insertPayload.full_name).toBe('Juan Pérez');
    expect(insertPayload.ip_address).toBe('203.0.113.5');
    expect(insertPayload.status).toBe('pending');
    expect(insertPayload.source).toBe('web');
  });

  it('lanza BadRequestException si supabase falla al insertar', async () => {
    client.from.mockReturnValue(createQueryBuilderMock({ data: null, error: { message: 'boom' } }));
    await expect(
      service.create({ full_name: 'Juan', message: 'Hola' }, '127.0.0.1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('findAll devuelve la lista ordenada de consultas', async () => {
    client.from.mockReturnValue(createQueryBuilderMock({ data: [{ id: 1 }, { id: 2 }], error: null }));
    const result = await service.findAll();
    expect(result).toHaveLength(2);
  });
});
