import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { SupabaseService } from '../supabase/supabase.service';
import { createQueryBuilderMock, createSupabaseClientMock } from '../test-utils/supabase-mock';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { AgencyUserRecord } from './entities/agency-user.entity';

const adminUser: AuthenticatedUser = {
  id: 'admin-1',
  email: 'admin@seminuevos.com',
  role: 'admin',
  full_name: 'Admin',
};

const salesUser: AuthenticatedUser = {
  id: 'sales-1',
  email: 'sales@seminuevos.com',
  role: 'sales',
  full_name: 'Vendedor',
};

function buildUserRecord(overrides: Partial<AgencyUserRecord> = {}): AgencyUserRecord {
  return {
    id: 'sales-1',
    full_name: 'Vendedor',
    email: 'sales@seminuevos.com',
    password_hash: '$2a$12$abcdefghijklmnopqrstuv',
    phone: null,
    role: 'sales',
    branch: 'Porlamar (Sede Principal)',
    status: 'active',
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('UsersService', () => {
  let service: UsersService;
  let client: ReturnType<typeof createSupabaseClientMock>;

  beforeEach(async () => {
    client = createSupabaseClientMock();
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: SupabaseService, useValue: { getClient: () => client } },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  describe('findByEmail', () => {
    it('devuelve null si no existe el usuario', async () => {
      client.from.mockReturnValue(createQueryBuilderMock({ data: null, error: null }));
      const result = await service.findByEmail('nadie@seminuevos.com');
      expect(result).toBeNull();
    });

    it('lanza BadRequestException si supabase devuelve error', async () => {
      client.from.mockReturnValue(createQueryBuilderMock({ data: null, error: { message: 'boom' } }));
      await expect(service.findByEmail('x@x.com')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('permite a un usuario consultar su propio perfil', async () => {
      client.from.mockReturnValue(createQueryBuilderMock({ data: buildUserRecord(), error: null }));
      const result = await service.findOne('sales-1', salesUser);
      expect(result.email).toBe('sales@seminuevos.com');
    });

    it('deniega a un usuario no-admin consultar el perfil de otro', async () => {
      await expect(service.findOne('otro-id', salesUser)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lanza NotFoundException si el admin consulta un id inexistente', async () => {
      client.from.mockReturnValue(createQueryBuilderMock({ data: null, error: null }));
      await expect(service.findOne('no-existe', adminUser)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    it('lanza ConflictException si el correo ya existe', async () => {
      client.from.mockReturnValue(createQueryBuilderMock({ data: buildUserRecord(), error: null }));
      await expect(
        service.create({
          email: 'sales@seminuevos.com',
          full_name: 'Nuevo',
          password: 'password123',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('crea el usuario con password_hash y nunca guarda la contraseña en texto plano', async () => {
      const { password_hash: _unused, ...safeInsertedRecord } = buildUserRecord({
        id: 'new-id',
        email: 'nuevo@seminuevos.com',
      });

      client.from
        .mockReturnValueOnce(createQueryBuilderMock({ data: null, error: null })) // findByEmail
        .mockReturnValueOnce(createQueryBuilderMock({ data: safeInsertedRecord, error: null })); // insert (select devuelve solo columnas seguras)

      const result = await service.create({
        email: 'nuevo@seminuevos.com',
        full_name: 'Nuevo Usuario',
        password: 'password123',
      });

      expect(result.email).toBe('nuevo@seminuevos.com');
      expect((result as unknown as Record<string, unknown>).password_hash).toBeUndefined();
      expect((result as unknown as Record<string, unknown>).password).toBeUndefined();
    });
  });

  describe('update', () => {
    it('deniega a un usuario no-admin editar el perfil de otro', async () => {
      await expect(service.update('otro-id', { full_name: 'X' }, salesUser)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('no permite a un usuario no-admin cambiar su propio rol', async () => {
      const builder = createQueryBuilderMock({ data: buildUserRecord(), error: null });
      client.from.mockReturnValue(builder);

      await service.update('sales-1', { role: 'admin', full_name: 'Vendedor Actualizado' }, salesUser);

      const updatePayload = (builder.update as jest.Mock).mock.calls[0][0];
      expect(updatePayload.role).toBeUndefined();
      expect(updatePayload.full_name).toBe('Vendedor Actualizado');
    });

    it('permite a un admin cambiar rol y status de otro usuario', async () => {
      const builder = createQueryBuilderMock({
        data: buildUserRecord({ role: 'credit', status: 'inactive' }),
        error: null,
      });
      client.from.mockReturnValue(builder);

      const result = await service.update('sales-1', { role: 'credit', status: 'inactive' }, adminUser);

      const updatePayload = (builder.update as jest.Mock).mock.calls[0][0];
      expect(updatePayload.role).toBe('credit');
      expect(updatePayload.status).toBe('inactive');
      expect(result.status).toBe('inactive');
    });
  });

  describe('remove', () => {
    it('deniega la eliminación a un usuario no-admin', async () => {
      await expect(service.remove('sales-1', salesUser)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('no permite que un admin se elimine a sí mismo', async () => {
      await expect(service.remove('admin-1', adminUser)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('no permite eliminar al último administrador', async () => {
      client.from.mockReturnValue(
        createQueryBuilderMock({ data: [{ id: 'admin-2' }], error: null }),
      );
      await expect(service.remove('admin-2', adminUser)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('elimina correctamente a un usuario cuando hay más de un admin', async () => {
      client.from
        .mockReturnValueOnce(
          createQueryBuilderMock({ data: [{ id: 'admin-1' }, { id: 'admin-2' }], error: null }),
        )
        .mockReturnValueOnce(createQueryBuilderMock({ data: null, error: null }));

      await expect(service.remove('admin-2', adminUser)).resolves.toBeUndefined();
    });
  });
});
