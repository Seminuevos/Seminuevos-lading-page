import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { SupabaseService } from '../supabase/supabase.service';
import { createQueryBuilderMock, createSupabaseClientMock } from '../test-utils/supabase-mock';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

const salesUser: AuthenticatedUser = {
  id: 'sales-1',
  email: 'sales@seminuevos.com',
  role: 'sales',
  full_name: 'Vendedor',
};

const concesionarioUser: AuthenticatedUser = {
  id: 'conc-1',
  email: 'conc@partner.com',
  role: 'concesionario',
  full_name: 'Concesionario Partner',
  concesionario_id: 42,
};

describe('VehiclesService', () => {
  let service: VehiclesService;
  let client: ReturnType<typeof createSupabaseClientMock>;

  beforeEach(async () => {
    client = createSupabaseClientMock();
    const module = await Test.createTestingModule({
      providers: [VehiclesService, { provide: SupabaseService, useValue: { getClient: () => client } }],
    }).compile();

    service = module.get(VehiclesService);
  });

  it('findPublic consulta solo vehículos activos y columnas seguras (sin created_by)', async () => {
    const builder = createQueryBuilderMock({
      data: [{ id: 1, title: 'Toyota Corolla 2022', price: '$18,000' }],
      error: null,
    });
    client.from.mockReturnValue(builder);

    const result = await service.findPublic();

    expect(result).toHaveLength(1);
    expect((builder.eq as jest.Mock)).toHaveBeenCalledWith('status', 'active');
    const selectedColumns = (builder.select as jest.Mock).mock.calls[0][0] as string;
    expect(selectedColumns).not.toContain('created_by');
    for (const col of ['trade_in_eligible', 'financing_eligible', 'has_title', 'available_for_rental']) {
      expect(selectedColumns).toContain(col);
    }
  });

  it('findOnePublic lanza NotFoundException si el vehículo no está activo o no existe', async () => {
    client.from.mockReturnValue(createQueryBuilderMock({ data: null, error: null }));
    await expect(service.findOnePublic('999')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('findAll devuelve la lista de vehículos', async () => {
    client.from.mockReturnValue(
      createQueryBuilderMock({ data: [{ id: 1, title: 'Toyota Corolla' }], error: null }),
    );
    const result = await service.findAll();
    expect(result).toHaveLength(1);
  });

  it('findAll lanza BadRequestException si supabase falla', async () => {
    client.from.mockReturnValue(createQueryBuilderMock({ data: null, error: { message: 'boom' } }));
    await expect(service.findAll()).rejects.toBeInstanceOf(BadRequestException);
  });

  it('findOne lanza NotFoundException si el vehículo no existe', async () => {
    client.from.mockReturnValue(createQueryBuilderMock({ data: null, error: null }));
    await expect(service.findOne('999')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('create asigna created_by con el email del usuario autenticado', async () => {
    const builder = createQueryBuilderMock({ data: { id: 1, title: 'Kia Sportage' }, error: null });
    client.from.mockReturnValue(builder);

    await service.create({ title: 'Kia Sportage' }, salesUser);

    const insertPayload = (builder.insert as jest.Mock).mock.calls[0][0][0];
    expect(insertPayload.created_by).toBe('sales@seminuevos.com');
    expect(insertPayload.status).toBe('active');
  });

  it('create fuerza concesionario_id al propio del usuario concesionario, ignorando el del DTO', async () => {
    const builder = createQueryBuilderMock({ data: { id: 1, title: 'Kia Sportage' }, error: null });
    client.from.mockReturnValue(builder);

    await service.create({ title: 'Kia Sportage', concesionario_id: 999 }, concesionarioUser);

    const insertPayload = (builder.insert as jest.Mock).mock.calls[0][0][0];
    expect(insertPayload.concesionario_id).toBe(42);
  });

  it('findAll de un concesionario filtra por su propio concesionario_id', async () => {
    const builder = createQueryBuilderMock({ data: [], error: null });
    client.from.mockReturnValue(builder);

    await service.findAll(concesionarioUser);

    expect(builder.eq).toHaveBeenCalledWith('concesionario_id', 42);
  });

  it('findAll de un admin no filtra por concesionario_id', async () => {
    const builder = createQueryBuilderMock({ data: [], error: null });
    client.from.mockReturnValue(builder);

    await service.findAll({ id: 'a1', email: 'a@a.com', role: 'admin', full_name: 'Admin' });

    expect(builder.eq).not.toHaveBeenCalled();
  });

  it('update lanza NotFoundException si el vehículo no existe', async () => {
    client.from.mockReturnValue(createQueryBuilderMock({ data: null, error: null }));
    await expect(service.update('999', { title: 'Nuevo título' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('remove propaga error de supabase como BadRequestException', async () => {
    client.from.mockReturnValue(createQueryBuilderMock({ data: null, error: { message: 'fail' } }));
    await expect(service.remove('1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('remove lanza NotFoundException si no borró ninguna fila (id ajeno o inexistente)', async () => {
    // .delete() sin filas afectadas devuelve error: null, data: [] — no debe reportarse como éxito.
    client.from.mockReturnValue(createQueryBuilderMock({ data: [], error: null }));
    await expect(service.remove('999', concesionarioUser)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('remove de un concesionario filtra por su propio concesionario_id', async () => {
    const builder = createQueryBuilderMock({ data: [{ id: 1 }], error: null });
    client.from.mockReturnValue(builder);

    await service.remove('1', concesionarioUser);

    expect(builder.eq).toHaveBeenCalledWith('concesionario_id', 42);
  });
});
