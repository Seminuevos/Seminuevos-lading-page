import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

const TABLE = 'settings';
const SETTINGS_ROW_ID = 1;

@Injectable()
export class SettingsService {
  constructor(private readonly supabase: SupabaseService) {}

  async find() {
    const { data, error } = await this.supabase
      .getClient()
      .from(TABLE)
      .select('*')
      .eq('id', SETTINGS_ROW_ID)
      .maybeSingle();

    if (error) {
      throw new BadRequestException('Error al obtener configuración');
    }
    return data ?? {};
  }

  async update(dto: UpdateSettingsDto) {
    const { data, error } = await this.supabase
      .getClient()
      .from(TABLE)
      .upsert([{ id: SETTINGS_ROW_ID, ...dto, updated_at: new Date().toISOString() }])
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Error al guardar configuración');
    }
    return data;
  }
}
