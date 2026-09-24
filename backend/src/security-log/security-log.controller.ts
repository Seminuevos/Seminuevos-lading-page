import { Body, Controller, Get, Ip, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { SecurityLogService } from './security-log.service';
import { CreateLogDto } from './dto/create-log.dto';

@Controller('api/security/log')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SecurityLogController {
  constructor(private readonly securityLogService: SecurityLogService) {}

  @Get()
  @Roles('admin', 'super_admin')
  findRecent() {
    return this.securityLogService.findRecent().then((data) => ({ data }));
  }

  @Post()
  async create(
    @Body() dto: CreateLogDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    await this.securityLogService.log({
      event_type: dto.event_type,
      severity: dto.severity,
      details: dto.details,
      ip_address: ip,
      user_id: user.id,
    });
    return { message: 'Evento registrado' };
  }
}
