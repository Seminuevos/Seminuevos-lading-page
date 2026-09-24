import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicSettingsService } from './public-settings.service';
import { PublicAnalyticsService } from './public-analytics.service';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { SecurityLogModule } from '../security-log/security-log.module';

@Module({
  imports: [VehiclesModule, SecurityLogModule],
  controllers: [PublicController],
  providers: [PublicSettingsService, PublicAnalyticsService],
})
export class PublicModule {}
