import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

const TABLE = 'site_settings';

export interface SiteSettingRow {
  key: string;
  value: unknown;
  updated_at?: string;
}

@Injectable()
export class SiteSettingsService {
  constructor(private readonly supabase: SupabaseService) {}

  /** Acceso admin: todas las filas, no solo la allowlist pública. */
  async findAll(): Promise<SiteSettingRow[]> {
    const { data, error } = await this.supabase.getClient().from(TABLE).select('*');
    if (error) {
      throw new BadRequestException('Error al obtener la configuración del sitio');
    }
    return data ?? [];
  }

  /** Upsert de una o varias keys a la vez. */
  async upsertMany(entries: Record<string, unknown>): Promise<void> {
    const rows = Object.entries(entries).map(([key, value]) => ({
      key,
      value,
      updated_at: new Date().toISOString(),
    }));
    if (rows.length === 0) return;

    const { error } = await this.supabase.getClient().from(TABLE).upsert(rows, { onConflict: 'key' });
    if (error) {
      throw new BadRequestException('Error al guardar la configuración del sitio');
    }
  }
}
