import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { TrackEventDto } from './dto/track-event.dto';

@Injectable()
export class PublicAnalyticsService {
  private readonly logger = new Logger(PublicAnalyticsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async track(dto: TrackEventDto): Promise<void> {
    try {
      const { error } = await this.supabase.getClient().from('site_analytics').insert([
        {
          event_type: dto.event_type,
          event_data: dto.event_data ?? null,
          visitor_id: dto.visitor_id ?? null,
          url: dto.url ?? null,
        },
      ]);
      if (error) {
        this.logger.warn(`No se pudo registrar analytics: ${error.message}`);
      }
    } catch (err) {
      this.logger.warn(`Excepción al registrar analytics: ${(err as Error).message}`);
    }
  }

  async incrementVehicleViews(vehicleId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .getClient()
        .rpc('increment_vehicle_views', { vehicle_id: Number(vehicleId) });
      if (error) {
        this.logger.warn(`No se pudo incrementar vistas del vehículo ${vehicleId}: ${error.message}`);
      }
    } catch (err) {
      this.logger.warn(`Excepción al incrementar vistas: ${(err as Error).message}`);
    }
  }
}
