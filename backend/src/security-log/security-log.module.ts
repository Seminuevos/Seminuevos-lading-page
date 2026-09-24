import { Module } from '@nestjs/common';
import { SecurityLogController } from './security-log.controller';
import { SecurityLogService } from './security-log.service';
import { IpBlacklistController } from './ip-blacklist.controller';
import { IpBlacklistService } from './ip-blacklist.service';

@Module({
  controllers: [SecurityLogController, IpBlacklistController],
  providers: [SecurityLogService, IpBlacklistService],
  exports: [SecurityLogService],
})
export class SecurityLogModule {}
