import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { IpBlacklistGuard } from './ip-blacklist.guard';
import { SupabaseService } from '../../supabase/supabase.service';
import { createQueryBuilderMock, createSupabaseClientMock } from '../../test-utils/supabase-mock';

function buildContext(ip: string): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ ip, socket: {} }) }),
  } as unknown as ExecutionContext;
}

describe('IpBlacklistGuard', () => {
  let client: ReturnType<typeof createSupabaseClientMock>;
  let guard: IpBlacklistGuard;

  beforeEach(() => {
    client = createSupabaseClientMock();
    guard = new IpBlacklistGuard({ getClient: () => client } as unknown as SupabaseService);
  });

  it('permite el acceso si la IP no está en la lista', async () => {
    client.from.mockReturnValue(createQueryBuilderMock({ data: null, error: null }));
    await expect(guard.canActivate(buildContext('1.2.3.4'))).resolves.toBe(true);
  });

  it('bloquea con ForbiddenException si la IP está bloqueada sin expiración', async () => {
    client.from.mockReturnValue(
      createQueryBuilderMock({ data: { ip: '1.2.3.4', expires_at: null }, error: null }),
    );
    await expect(guard.canActivate(buildContext('1.2.3.4'))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('permite el acceso si el bloqueo ya expiró', async () => {
    client.from.mockReturnValue(
      createQueryBuilderMock({
        data: { ip: '1.2.3.4', expires_at: '2000-01-01T00:00:00Z' },
        error: null,
      }),
    );
    await expect(guard.canActivate(buildContext('1.2.3.4'))).resolves.toBe(true);
  });

  it('falla abierto (permite el acceso) si Supabase da error', async () => {
    client.from.mockReturnValue(createQueryBuilderMock({ data: null, error: { message: 'boom' } }));
    await expect(guard.canActivate(buildContext('1.2.3.4'))).resolves.toBe(true);
  });

  it('permite el acceso si no hay IP disponible en el request', async () => {
    await expect(guard.canActivate(buildContext(''))).resolves.toBe(true);
    expect(client.from).not.toHaveBeenCalled();
  });
});
