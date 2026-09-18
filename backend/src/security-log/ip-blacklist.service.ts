import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

const TABLE = 'ip_blacklist';

export interface BlockIpInput {
  ip: string;
  reason?: string;
  expires_at?: string | null;
}

@Injectable()
export class IpBlacklistService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll() {
    const { data, error } = await this.supabase
      .getClient()
      .from(TABLE)
      .select('*')
      .order('blocked_at', { ascending: false });

    if (error) {
      throw new BadRequestException('Error al obtener la lista de bloqueo');
    }
    return data ?? [];
  }

  async block(input: BlockIpInput) {
    const { data, error } = await this.supabase
      .getClient()
      .from(TABLE)
      .upsert(
        [
          {
            ip: input.ip,
            reason: input.reason ?? null,
            expires_at: input.expires_at ?? null,
          },
        ],
        { onConflict: 'ip' },
      )
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Error al bloquear la IP');
    }
    return data;
  }

  async unblock(ip: string) {
    const { error } = await this.supabase.getClient().from(TABLE).delete().eq('ip', ip);
    if (error) {
      throw new BadRequestException('Error al desbloquear la IP');
    }
  }
}
