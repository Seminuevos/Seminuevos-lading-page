import { Body, Controller, Get, HttpCode, Ip, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { VehiclesService } from '../vehicles/vehicles.service';
import { PublicSettingsService } from './public-settings.service';
import { PublicAnalyticsService } from './public-analytics.service';
import { SecurityLogService } from '../security-log/security-log.service';
import { TrackEventDto, ReportSecurityEventDto } from './dto/track-event.dto';

/**
 * Rutas 100% públicas y sin autenticación. Existen para que el frontend
 * (páginas servidas por el proyecto `frontend/`) nunca necesite conocer la
 * URL ni las claves del proyecto de Supabase: todo pasa por este backend.
 */
@Controller('api/public')
export class PublicController {
  constructor(
    private readonly vehiclesService: VehiclesService,
    private readonly publicSettingsService: PublicSettingsService,
    private readonly analyticsService: PublicAnalyticsService,
    private readonly securityLogService: SecurityLogService,
  ) {}

  @Get('vehicles')
  findVehicles() {
    return this.vehiclesService.findPublic().then((data) => ({ data }));
  }

  @Get('vehicles/:id')
  findVehicle(@Param('id') id: string) {
    return this.vehiclesService.findOnePublic(id).then((data) => ({ data }));
  }

  @Post('vehicles/:id/view')
  @HttpCode(204)
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async trackView(@Param('id') id: string) {
    await this.analyticsService.incrementVehicleViews(id);
  }

  @Get('settings')
  findSettings() {
    return this.publicSettingsService.getPublicSettings().then((data) => ({ data }));
  }

  @Post('analytics')
  @HttpCode(204)
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async trackEvent(@Body() dto: TrackEventDto) {
    await this.analyticsService.track(dto);
  }

  @Post('security-events')
  @HttpCode(204)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async reportSecurityEvent(@Body() dto: ReportSecurityEventDto, @Ip() ip: string) {
    await this.securityLogService.log({
      event_type: dto.event_type,
      severity: 'warning',
      details: dto.details,
      ip_address: ip,
    });
  }
}
