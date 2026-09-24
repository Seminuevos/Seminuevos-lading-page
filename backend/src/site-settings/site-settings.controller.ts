import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SiteSettingsService } from './site-settings.service';

/**
 * Contraparte autenticada de /api/public/settings: acceso admin a TODAS las
 * keys de site_settings (hero slides, promociones, textos del sitio, etc.),
 * no solo la allowlist pública. Reemplaza los `supabaseClient.from('site_settings')`
 * directos del panel de operaciones.
 */
@Controller('api/site-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SiteSettingsController {
  constructor(private readonly siteSettingsService: SiteSettingsService) {}

  @Get()
  findAll() {
    return this.siteSettingsService.findAll().then((data) => ({ data }));
  }

  @Put()
  @Roles('admin', 'super_admin')
  upsert(@Body() body: Record<string, unknown>) {
    return this.siteSettingsService.upsertMany(body).then(() => ({ message: 'Configuración guardada' }));
  }
}
