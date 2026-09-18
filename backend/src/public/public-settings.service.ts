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

export interface SiteSettingRow {
  key: string;
  value: unknown;
}

@Injectable()
export class PublicSettingsService {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Devuelve las filas [{key, value}] tal cual las devolvía
   * `supabase.from('site_settings').select('*')` desde el navegador — así el
   * frontend (script.js/vehiculo.js) no tuvo que rehacer su lógica de
   * `sData.forEach(s => map[s.key] = ...)`, solo cambiar de dónde la pide.
   */
  async getPublicSettings(): Promise<SiteSettingRow[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from(TABLE)
      .select('key, value')
      .in('key', Array.from(PUBLIC_KEYS));

    if (error) {
      throw new BadRequestException('Error al obtener la configuración pública');
    }

    // Defensa en profundidad: aunque la key no debería salir del .in() de
    // arriba, nunca reenviamos una fila cuya key no esté en la allowlist.
    return (data ?? []).filter((row): row is SiteSettingRow => PUBLIC_KEYS.has(row.key));
  }
}
