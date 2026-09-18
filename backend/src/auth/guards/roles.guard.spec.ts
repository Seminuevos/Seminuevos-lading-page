import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { AuthenticatedUser } from '../interfaces/jwt-payload.interface';

function buildContext(user: AuthenticatedUser | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('permite el acceso si la ruta no declara roles requeridos', () => {
    const reflector = { getAllAndOverride: jest.fn(() => undefined) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(buildContext(undefined))).toBe(true);
  });

  it('permite el acceso si el usuario tiene uno de los roles requeridos', () => {
    const reflector = { getAllAndOverride: jest.fn(() => ['admin', 'super_admin']) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const user: AuthenticatedUser = { id: '1', email: 'a@a.com', role: 'admin', full_name: 'A' };
    expect(guard.canActivate(buildContext(user))).toBe(true);
  });

  it('deniega el acceso si el usuario no tiene el rol requerido', () => {
    const reflector = { getAllAndOverride: jest.fn(() => ['admin', 'super_admin']) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const user: AuthenticatedUser = { id: '1', email: 'a@a.com', role: 'sales', full_name: 'A' };
    expect(() => guard.canActivate(buildContext(user))).toThrow(ForbiddenException);
  });

  it('deniega el acceso si no hay usuario en el request', () => {
    const reflector = { getAllAndOverride: jest.fn(() => ['admin']) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(() => guard.canActivate(buildContext(undefined))).toThrow(ForbiddenException);
  });
});
