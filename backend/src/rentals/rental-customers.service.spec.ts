import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { RentalCustomersService } from './rental-customers.service';
import { SupabaseService } from '../supabase/supabase.service';
import { createQueryBuilderMock, createSupabaseClientMock } from '../test-utils/supabase-mock';

describe('RentalCustomersService', () => {
  let service: RentalCustomersService;
  let client: ReturnType<typeof createSupabaseClientMock>;

  beforeEach(async () => {
    client = createSupabaseClientMock();
    const module = await Test.createTestingModule({
      providers: [RentalCustomersService, { provide: SupabaseService, useValue: { getClient: () => client } }],
    }).compile();

    service = module.get(RentalCustomersService);
  });

  it('crea un cliente nuevo si el email no existe', async () => {
    client.from
      .mockReturnValueOnce(createQueryBuilderMock({ data: null, error: null })) // find
      .mockReturnValueOnce(
        createQueryBuilderMock({ data: { id: 'c1', email: 'a@a.com', phone: '123' }, error: null }),
      ); // insert

    const result = await service.findOrCreate({ email: 'A@A.com', phone: '123' });

    expect(result.id).toBe('c1');
  });

  it('reutiliza el cliente existente sin escribir si no hay cambios', async () => {
    const existing = { id: 'c1', email: 'a@a.com', phone: '123', full_name: 'Juan' };
    client.from.mockReturnValueOnce(createQueryBuilderMock({ data: existing, error: null }));

    const result = await service.findOrCreate({ email: 'a@a.com', phone: '123', full_name: 'Juan' });

    expect(result).toEqual(existing);
    expect(client.from).toHaveBeenCalledTimes(1); // nunca llamó a update
  });

  it('actualiza el teléfono si vino distinto al que ya tenía', async () => {
    const existing = { id: 'c1', email: 'a@a.com', phone: '111', full_name: 'Juan' };
    const updateBuilder = createQueryBuilderMock({ data: { ...existing, phone: '222' }, error: null });
    client.from
      .mockReturnValueOnce(createQueryBuilderMock({ data: existing, error: null }))
      .mockReturnValueOnce(updateBuilder);

    const result = await service.findOrCreate({ email: 'a@a.com', phone: '222' });

    const payload = (updateBuilder.update as jest.Mock).mock.calls[0][0];
    expect(payload).toEqual({ phone: '222' });
    expect(result.phone).toBe('222');
  });

  it('lanza BadRequestException si falla la búsqueda', async () => {
    client.from.mockReturnValue(createQueryBuilderMock({ data: null, error: { message: 'boom' } }));
    await expect(service.findOrCreate({ email: 'a@a.com', phone: '123' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
