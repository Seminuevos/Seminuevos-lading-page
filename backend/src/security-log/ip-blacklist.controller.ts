import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { IpBlacklistService } from './ip-blacklist.service';
import { BlockIpDto } from './dto/block-ip.dto';

@Controller('api/security/ip-blacklist')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class IpBlacklistController {
  constructor(private readonly ipBlacklistService: IpBlacklistService) {}

  @Get()
  findAll() {
    return this.ipBlacklistService.findAll().then((data) => ({ data }));
  }

  @Post()
  block(@Body() dto: BlockIpDto) {
    return this.ipBlacklistService.block(dto).then((data) => ({ data }));
  }

  @Delete(':ip')
  unblock(@Param('ip') ip: string) {
    return this.ipBlacklistService.unblock(ip).then(() => ({ message: 'IP desbloqueada' }));
  }
}
