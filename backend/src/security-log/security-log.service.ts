import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export type SecuritySeverity = 'info' | 'warning' | 'critical';

export interface SecurityLogInput {
  event_type: string;
  severity?: SecuritySeverity;
  details?: string;
  ip_address?: string;
  user_id?: string | null;
}

const TABLE = 'security_logs';

@Injectable()
export class SecurityLogService {
  private readonly logger = new Logger(SecurityLogService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async log(input: SecurityLogInput): Promise<void> {
    try {
      const { error } = await this.supabase.getClient().from(TABLE).insert([
        {
          event_type: input.event_type,
          severity: input.severity ?? 'info',
          details: input.details ?? null,
          ip_address: input.ip_address ?? null,
          user_id: input.user_id ?? null,
        },
      ]);
      if (error) {
        this.logger.warn(`No se pudo registrar el evento de seguridad: ${error.message}`);
      }
    } catch (err) {
      // El logging de seguridad nunca debe romper el flujo principal de la request.
      this.logger.warn(`Excepción al registrar evento de seguridad: ${(err as Error).message}`);
    }
  }

  async findRecent(limit = 500) {
    const { data, error } = await this.supabase
      .getClient()
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }
    return data ?? [];
  }
}
