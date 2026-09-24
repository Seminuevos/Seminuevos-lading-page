import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RentalVehiclesService } from './rental-vehicles.service';
import { SupabaseService } from '../supabase/supabase.service';
import { createQueryBuilderMock, createSupabaseClientMock } from '../test-utils/supabase-mock';

describe('RentalVehiclesService', () => {
  let service: RentalVehiclesService;
  let client: ReturnType<typeof createSupabaseClientMock>;

  beforeEach(async () => {
    client = createSupabaseClientMock();
    const module = await Test.createTestingModule({
      providers: [RentalVehiclesService, { provide: SupabaseService, useValue: { getClient: () => client } }],
    }).compile();

    service = module.get(RentalVehiclesService);
  });

  it('findAllPublic solo pide vehículos con status=available', async () => {
    const builder = createQueryBuilderMock({ data: [{ id: 1 }], error: null });
    client.from.mockReturnValue(builder);

    await service.findAllPublic();

    expect(builder.eq).toHaveBeenCalledWith('status', 'available');
  });

  it('findOnePublic lanza NotFoundException si no existe o no está disponible', async () => {
    client.from.mockReturnValue(createQueryBuilderMock({ data: null, error: null }));
    await expect(service.findOnePublic(999)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('create usa status=available por defecto', async () => {
    const builder = createQueryBuilderMock({ data: { id: 1 }, error: null });
    client.from.mockReturnValue(builder);

    await service.create({ title: 'Toyota Corolla', default_price_per_day: 40 });

    const payload = (builder.insert as jest.Mock).mock.calls[0][0][0];
    expect(payload.status).toBe('available');
  });

  it('update lanza NotFoundException si el vehículo no existe', async () => {
    client.from.mockReturnValue(createQueryBuilderMock({ data: null, error: null }));
    await expect(service.update(999, { title: 'x' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('findPriceRules filtra por rental_vehicle_id y ordena por start_date', async () => {
    const builder = createQueryBuilderMock({ data: [{ id: 1 }], error: null });
    client.from.mockReturnValue(builder);

    await service.findPriceRules(5);

    expect(builder.eq).toHaveBeenCalledWith('rental_vehicle_id', 5);
    expect(builder.order).toHaveBeenCalledWith('start_date', { ascending: true });
  });

  it('createPriceRule asocia la regla al vehículo correcto', async () => {
    const builder = createQueryBuilderMock({ data: { id: 1 }, error: null });
    client.from.mockReturnValue(builder);

    await service.createPriceRule(5, { start_date: '2026-12-01', end_date: '2026-12-31', price_per_day: 100 });

    const payload = (builder.insert as jest.Mock).mock.calls[0][0][0];
    expect(payload.rental_vehicle_id).toBe(5);
  });

  it('propaga errores de supabase como BadRequestException', async () => {
    client.from.mockReturnValue(createQueryBuilderMock({ data: null, error: { message: 'boom' } }));
    await expect(service.findAllAdmin()).rejects.toBeInstanceOf(BadRequestException);
  });
});
