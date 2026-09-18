import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { SecurityLogService } from '../security-log/security-log.service';
import { AgencyUserRecord } from '../users/entities/agency-user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: { findByEmail: jest.Mock };
  let securityLog: { log: jest.Mock };
  let jwtService: { sign: jest.Mock };

  const buildUser = async (password: string, overrides: Partial<AgencyUserRecord> = {}): Promise<AgencyUserRecord> => ({
    id: 'user-1',
    full_name: 'Administrador',
    email: 'admin@seminuevos.com',
    password_hash: await bcrypt.hash(password, 4),
    phone: null,
    role: 'admin',
    branch: 'Porlamar (Sede Principal)',
    status: 'active',
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  });

  beforeEach(async () => {
    usersService = { findByEmail: jest.fn() };
    securityLog = { log: jest.fn() };
    jwtService = { sign: jest.fn(() => 'signed.jwt.token') };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: SecurityLogService, useValue: securityLog },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('rechaza credenciales cuando el usuario no existe', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    await expect(
      service.login({ email: 'nadie@seminuevos.com', password: 'cualquiera' }, '127.0.0.1'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(securityLog.log).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: 'LOGIN_FAILED' }),
    );
  });

  it('rechaza una cuenta suspendida', async () => {
    usersService.findByEmail.mockResolvedValue(await buildUser('secret123', { status: 'inactive' }));
    await expect(
      service.login({ email: 'admin@seminuevos.com', password: 'secret123' }, '127.0.0.1'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rechaza una contraseña incorrecta y registra el intento fallido', async () => {
    usersService.findByEmail.mockResolvedValue(await buildUser('secret123'));
    await expect(
      service.login({ email: 'admin@seminuevos.com', password: 'password-incorrecta' }, '127.0.0.1'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(securityLog.log).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: 'LOGIN_FAILED', user_id: 'user-1' }),
    );
  });

  it('nunca acepta contraseñas "maestras" hardcodeadas — no existe backdoor', async () => {
    usersService.findByEmail.mockResolvedValue(await buildUser('secret123'));
    const backdoorPasswords = ['MasterAdmin2026!', 'Admin2026!', '12345678', 'admin2026'];
    for (const password of backdoorPasswords) {
      await expect(
        service.login({ email: 'admin@seminuevos.com', password }, '127.0.0.1'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    }
  });

  it('emite un JWT válido y datos seguros del usuario con credenciales correctas', async () => {
    usersService.findByEmail.mockResolvedValue(await buildUser('secret123'));
    const result = await service.login(
      { email: 'admin@seminuevos.com', password: 'secret123' },
      '127.0.0.1',
    );

    expect(typeof result.token).toBe('string');
    expect(result.user.email).toBe('admin@seminuevos.com');
    expect((result.user as unknown as Record<string, unknown>).password_hash).toBeUndefined();
    expect(securityLog.log).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: 'LOGIN_SUCCESS' }),
    );
  });

  it('logout no falla cuando no hay usuario (token inválido o ausente)', async () => {
    await expect(service.logout(null, '127.0.0.1')).resolves.toBeUndefined();
    expect(securityLog.log).not.toHaveBeenCalled();
  });
});
