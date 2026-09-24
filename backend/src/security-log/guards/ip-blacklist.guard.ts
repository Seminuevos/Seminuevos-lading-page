import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

/**
 * Reemplaza el chequeo de `ip_blacklist` que antes hacía el navegador
 * (fetch a ipify.org + query directa a Supabase con la anon key). Un chequeo
 * del lado del cliente nunca protege nada real — cualquiera puede simplemente
 * no ejecutar ese JS. Esto sí importa: bloquea la request en el servidor,
 * usando la IP real del request (no una que el cliente diga tener).
 *
 * Fail-open: si Supabase no responde, no tumba el sitio completo por eso.
 * Corre en CADA request (es un guard global), así que además tiene un
 * timeout corto — sin él, un Supabase lento/caído agrega esa misma demora a
 * todo el sitio en vez de solo fallar abierto.
 */
const CHECK_TIMEOUT_MS = 2500;

@Injectable()
export class IpBlacklistGuard implements CanActivate {
  private readonly logger = new Logger(IpBlacklistGuard.name);

  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip: string = request.ip || request.socket?.remoteAddress || '';
    if (!ip) return true;

    try {
      const query = this.supabase
        .getClient()
        .from('ip_blacklist')
        .select('ip, expires_at')
        .eq('ip', ip)
        .maybeSingle();

      let timer: ReturnType<typeof setTimeout>;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('ip_blacklist check timeout')), CHECK_TIMEOUT_MS);
      });

      const { data, error } = await Promise.race([query, timeout]).finally(() => clearTimeout(timer));

      if (error) {
        this.logger.warn(`No se pudo verificar ip_blacklist: ${error.message}`);
        return true;
      }

      if (data && (!data.expires_at || new Date(data.expires_at) > new Date())) {
        throw new ForbiddenException('Acceso restringido.');
      }
      return true;
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      this.logger.warn(`Excepción verificando ip_blacklist: ${(err as Error).message}`);
      return true;
    }
  }
}
