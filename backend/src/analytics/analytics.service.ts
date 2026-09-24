import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

const ANALYTICS_TABLE = 'site_analytics';
const LEADS_TABLE = 'site_leads';

@Injectable()
export class AnalyticsService {
  constructor(private readonly supabase: SupabaseService) {}

  async findRecent(limit = 1000) {
    const { data, error } = await this.supabase
      .getClient()
      .from(ANALYTICS_TABLE)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new BadRequestException('Error al obtener analíticas');
    }
    return data ?? [];
  }

  async findLeads(limit = 500) {
    const { data, error } = await this.supabase
      .getClient()
      .from(LEADS_TABLE)
      .select('*')
      .order('last_active', { ascending: false })
      .limit(limit);

    if (error) {
      throw new BadRequestException('Error al obtener leads');
    }
    return data ?? [];
  }
}
