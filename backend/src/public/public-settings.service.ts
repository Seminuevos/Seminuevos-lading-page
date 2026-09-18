import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

const TABLE = 'site_settings';

// Defensa en profundidad: aunque la política RLS de `site_settings` ya
// restringe qué puede leer `anon`, el backend nunca reenvía una key que no
// esté explícitamente aquí. Así, aunque alguien inserte una key sensible por
// error en site_settings, jamás sale por esta ruta pública.
const PUBLIC_KEYS = new Set([
  'whatsapp_number',
  'company_name',
  'company_slogan',
  'company_address',
  'company_hours',
  'social_facebook',
  'social_instagram',
  'social_tiktok',
  'social_youtube',
  'promo_tag',
  'promo_title',
  'promo_subtitle',
  'hero1_img',
  'hero2_img',
  'hero3_img',
  'hero_slides',
  'calc_flete',
  'calc_aduana',
  'calc_doc_vzla',
  'calc_service_fee',
  'promotions_list',
]);

@Injectable()
export class PublicSettingsService {
  constructor(private readonly supabase: SupabaseService) {}

  async getPublicSettings(): Promise<Record<string, unknown>> {
    const { data, error } = await this.supabase
      .getClient()
      .from(TABLE)
      .select('key, value')
      .in('key', Array.from(PUBLIC_KEYS));

    if (error) {
      throw new BadRequestException('Error al obtener la configuración pública');
    }

    const result: Record<string, unknown> = {};
    for (const row of (data ?? []) as { key: string; value: unknown }[]) {
      if (!PUBLIC_KEYS.has(row.key)) continue; // defensa en profundidad
      result[row.key] = row.value;
    }
    return result;
  }
}
