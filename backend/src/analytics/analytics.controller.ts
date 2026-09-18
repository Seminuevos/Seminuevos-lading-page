import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@Controller('api/analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  findRecent() {
    return this.analyticsService.findRecent().then((data) => ({ data }));
  }

  @Get('leads')
  findLeads() {
    return this.analyticsService.findLeads().then((data) => ({ data }));
  }
}
