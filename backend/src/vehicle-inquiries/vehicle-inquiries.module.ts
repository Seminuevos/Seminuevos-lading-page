import { Module } from '@nestjs/common';
import { VehicleInquiriesController } from './vehicle-inquiries.controller';
import { VehicleInquiriesService } from './vehicle-inquiries.service';

@Module({
  controllers: [VehicleInquiriesController],
  providers: [VehicleInquiriesService],
})
export class VehicleInquiriesModule {}
