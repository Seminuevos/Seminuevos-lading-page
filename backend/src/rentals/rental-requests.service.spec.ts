import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RentalRequestsService } from './rental-requests.service';
import { RentalCustomersService } from './rental-customers.service';
import { RentalVehiclesService } from './rental-vehicles.service';
import { SupabaseService } from '../supabase/supabase.service';
import { createQueryBuilderMock, createSupabaseClientMock } from '../test-utils/supabase-mock';

describe('RentalRequestsService', () => {
  let service: RentalRequestsService;
  let client: ReturnType<typeof createSupabaseClientMock>;
  let customersService: { findOrCreate: jest.Mock };
  let vehiclesService: { findOnePublic: jest.Mock; findPriceRules: jest.Mock };

  beforeEach(async () => {
    client = createSupabaseClientMock();
    customersService = { findOrCreate: jest.fn().mockResolvedValue({ id: 'cust-1' }) };
    vehiclesService = {
      findOnePublic: jest.fn().mockResolvedValue({ id: 1, default_price_per_day: 50 }),
      findPriceRules: jest.fn().mockResolvedValue([]),
    };

    const module = await Test.createTestingModule({
      providers: [
        RentalRequestsService,
        { provide: SupabaseService, useValue: { getClient: () => client } },
        { provide: RentalCustomersService, useValue: customersService },
        { provide: RentalVehiclesService, useValue: vehiclesService },
      ],
    }).compile();

    service = module.get(RentalRequestsService);
  });

  it('rechaza si end_date no es posterior a start_date', async () => {
    await expect(
      service.create({
        email: 'a@a.com',
        phone: '123',
        vehicle_ids: [1],
        start_date: '2026-10-05',
        end_date: '2026-10-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(customersService.findOrCreate).not.toHaveBeenCalled();
  });

  it('crea una fila por vehículo, todas con el mismo request_group_id', async () => {
    const builder = createQueryBuilderMock({
      data: [{ id: 10 }, { id: 11 }],
      error: null,
    });
    client.from.mockReturnValue(builder);

    const result = await service.create({
      email: 'a@a.com',
      phone: '123',
      vehicle_ids: [1, 2],
      start_date: '2026-10-01',
      end_date: '2026-10-04',
    });

    expect(vehiclesService.findOnePublic).toHaveBeenCalledTimes(2);
    const rows = (builder.insert as jest.Mock).mock.calls[0][0];
    expect(rows).toHaveLength(2);
    expect(rows[0].request_group_id).toBe(rows[1].request_group_id);
    expect(rows[0].customer_id).toBe('cust-1');
    expect(rows[0].estimated_total).toBe(150); // 3 días x $50
    expect(result.requests).toHaveLength(2);
  });

  it('propaga NotFoundException si algún vehículo no existe/no está disponible', async () => {
    vehiclesService.findOnePublic.mockRejectedValue(new NotFoundException('Vehículo de alquiler no encontrado'));

    await expect(
      service.create({
        email: 'a@a.com',
        phone: '123',
        vehicle_ids: [999],
        start_date: '2026-10-01',
        end_date: '2026-10-04',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updateStatus lanza NotFoundException si la solicitud no existe', async () => {
    client.from.mockReturnValue(createQueryBuilderMock({ data: null, error: null }));
    await expect(service.updateStatus(999, { status: 'contacted' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('findAllAdmin trae datos de cliente y vehículo vía join', async () => {
    const builder = createQueryBuilderMock({ data: [{ id: 1 }], error: null });
    client.from.mockReturnValue(builder);

    await service.findAllAdmin();

    const selectArg = (builder.select as jest.Mock).mock.calls[0][0];
    expect(selectArg).toContain('rental_customers');
    expect(selectArg).toContain('rental_vehicles');
  });
});
