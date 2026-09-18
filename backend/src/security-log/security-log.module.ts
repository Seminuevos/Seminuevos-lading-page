import { Module } from '@nestjs/common';
import { SecurityLogController } from './security-log.controller';
import { SecurityLogService } from './security-log.service';

@Module({
  controllers: [SecurityLogController],
  providers: [SecurityLogService],
  exports: [SecurityLogService],
})
export class SecurityLogModule {}
